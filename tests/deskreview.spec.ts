import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";
import {
  findings,
  sampleManuscript,
} from "../components/deskreview/review-data";
import {
  authorFiles,
  emptyDraft,
} from "../components/deskreview/reviewer-model";

test("author package allowlist excludes all private data and uncommitted edits", () => {
  const draft = emptyDraft();
  draft.internalNote = "PRIVATE_EDITORIAL_NOTE";
  draft.recommendation = "Decline";
  draft.authorAssessment = "EXPLICIT_AUTHOR_ASSESSMENT";
  draft.decisions = {
    1: {
      status: "accepted",
      internalNote: "PRIVATE_FINDING_NOTE",
      editBuffer: {
        title: "UNCOMMITTED_TITLE",
        detail: "UNCOMMITTED_COMMENT",
        suggestion: "UNCOMMITTED_SUGGESTION",
      },
    },
    2: {
      status: "edited",
      wording: {
        title: "Reviewer title",
        detail: "Reviewer comment",
        suggestion: "Reviewer revision",
      },
      rejectionReason: "PREVIOUS_PRIVATE_REASON",
    },
    3: { status: "rejected", rejectionReason: "PRIVATE_REJECTION_REASON" },
    4: {
      status: "pending",
      wording: {
        title: "UNREVIEWED_TITLE",
        detail: "UNREVIEWED_COMMENT",
        suggestion: "UNREVIEWED_SUGGESTION",
      },
    },
  };
  const files = authorFiles(sampleManuscript, findings, draft);
  expect(files.map((f) => f.name)).toEqual([
    "author_review.md",
    "findings.json",
  ]);
  const text = files.map((f) => f.content).join("\n");
  expect(text).toContain("Reviewer comment");
  for (const secret of [
    "PRIVATE_",
    "UNCOMMITTED_",
    "UNREVIEWED_",
    "EXPLICIT_AUTHOR_ASSESSMENT",
    "Decline",
    findings[1].detail,
    findings[2].title,
    findings[3].title,
  ])
    expect(text).not.toContain(secret);
  const json = JSON.parse(files[1].content);
  expect(json.findings.map((f: { number: number }) => f.number)).toEqual([
    1, 2,
  ]);
  expect(Object.keys(json.findings[0]).sort()).toEqual([
    "category",
    "comment",
    "number",
    "passage",
    "priority",
    "suggestedRevision",
    "title",
  ]);
  draft.shareAssessment = true;
  expect(authorFiles(sampleManuscript, findings, draft)[0].content).toContain(
    "EXPLICIT_AUTHOR_ASSESSMENT",
  );
  expect(authorFiles(sampleManuscript, findings, emptyDraft())).toEqual([]);
});

test("accept, edit, reject, undo, and author ZIP work end to end", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/deskreview");
  await expect(
    page.getByRole("button", { name: "Start reviewing" }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/reviewer-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start reviewing" }).click();
  const first = page.locator("#finding-1");
  await expect(page.locator("#doc-methods")).toBeInViewport();
  await first.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(first.locator(".status-accepted")).toHaveText("Accepted");
  await first.getByRole("button", { name: "Edit", exact: true }).click();
  await first
    .getByLabel("Comment to author")
    .fill("Temporary edit that must disappear on undo.");
  await first.getByRole("button", { name: "Save & accept" }).click();
  await expect(first.locator(".status-edited")).toHaveText("Edited");
  await page.getByRole("button", { name: "Undo last decision" }).click();
  await expect(first.locator(".status-accepted")).toHaveText("Accepted");
  await expect(first.locator(".finding-detail")).toHaveText(findings[0].detail);
  await first.locator(".internal-note summary").click();
  await first
    .getByLabel("Internal note for finding 1")
    .fill("PRIVATE_FINDING_NOTE");
  await page.getByRole("button", { name: "Next pending", exact: true }).click();
  const second = page.locator("#finding-2");
  await expect(second).toHaveClass(/finding-active/);
  await second.getByRole("button", { name: "Edit", exact: true }).click();
  await second.getByLabel("Finding title").fill("Use association language");
  await second
    .getByLabel("Comment to author")
    .fill(
      "Please align the conclusions with the cross-sectional study design.",
    );
  await second
    .getByLabel("Suggested revision")
    .fill("Describe an association and remove causal wording.");
  await second.locator(".original-wording summary").click();
  await expect(second.locator(".original-wording")).toContainText(
    findings[1].detail,
  );
  await second.getByRole("button", { name: "Save & accept" }).click();
  await expect(second.locator(".status-edited")).toHaveText("Edited");
  await page.getByRole("button", { name: "Next pending", exact: true }).click();
  const third = page.locator("#finding-3");
  await third.getByRole("button", { name: "Reject", exact: true }).click();
  await third
    .getByLabel(/Internal rejection reason/)
    .fill("PRIVATE_REJECTION_REASON");
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(page.getByText("3 of 8 findings reviewed")).toBeVisible();
  await page.getByLabel("Internal recommendation").selectOption("Decline");
  await page
    .getByLabel("Internal notes", { exact: true })
    .fill("PRIVATE_EDITORIAL_NOTE");
  await page.getByLabel("Message to author").fill("UNSHARED_ASSESSMENT");
  await page.getByRole("button", { name: /Author package/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Author package preview" }),
  ).toBeVisible();
  await expect(page.getByText("5 findings still pending.")).toBeVisible();
  const preview = page.locator(".file-preview-content");
  await expect(preview).toContainText("Use association language");
  await expect(preview).not.toContainText("PRIVATE_");
  await expect(preview).not.toContainText("UNSHARED_ASSESSMENT");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download accepted findings" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("deskreview-author-review.zip");
  const zip = await JSZip.loadAsync(
    await fs.readFile((await download.path())!),
  );
  expect(Object.keys(zip.files)).toEqual(["author_review.md", "findings.json"]);
  const json = JSON.parse(await zip.file("findings.json")!.async("string"));
  expect(json.findings).toHaveLength(2);
  expect(json.findings[1].title).toBe("Use association language");
  const exported = await zip.file("author_review.md")!.async("string");
  expect(exported).not.toContain("PRIVATE_");
  expect(exported).not.toContain("UNSHARED_ASSESSMENT");
  expect(exported).not.toContain("Temporary edit");
  expect(exported).not.toContain(findings[2].title);
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Message to author")
    .fill("Please revise the methodological reporting.");
  await page
    .getByLabel("Include this assessment in the author package")
    .check();
  await page.getByRole("button", { name: /Author package/ }).click();
  await expect(preview).toContainText(
    "Please revise the methodological reporting.",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Findings" }).click();
  await page
    .locator(".finding-filters")
    .getByRole("button", { name: /Rejected/ })
    .click();
  await expect(page.locator(".finding-card")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("draft edits, private notes, theme, active finding, and reading position resume", async ({
  page,
}) => {
  await page.goto("/deskreview");
  await page.getByRole("button", { name: "Start reviewing" }).click();
  await page.getByRole("button", { name: "Next finding", exact: true }).click();
  const second = page.locator("#finding-2");
  await second.getByRole("button", { name: "Edit", exact: true }).click();
  await second
    .getByLabel("Comment to author")
    .fill("Unfinished reviewer wording kept across reload.");
  await page.getByLabel("Color theme").selectOption("dark");
  await expect(page.locator(".save-indicator")).toContainText(
    "Saved on this browser",
  );
  const top = await page
    .locator(".document-scroll")
    .evaluate((el) => el.scrollTop);
  expect(top).toBeGreaterThan(100);
  await page.reload();
  await expect(page.locator(".save-indicator")).toContainText(
    "Saved on this browser",
  );
  await expect(page.getByRole("tab", { name: "Findings" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("Color theme")).toHaveValue("dark");
  await expect(second).toHaveClass(/finding-active/);
  await expect(second.getByLabel("Comment to author")).toHaveValue(
    "Unfinished reviewer wording kept across reload.",
  );
  await expect
    .poll(async () =>
      page.locator(".document-scroll").evaluate((el) => el.scrollTop),
    )
    .toBeGreaterThan(top - 25);
  await second.getByRole("button", { name: "Cancel edit" }).click();
  await expect(second.locator(".finding-detail")).toHaveText(
    findings[1].detail,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight -
        document.querySelector(".desk-app")!.scrollHeight,
    ),
  ).toBeLessThan(4);
  await page.screenshot({
    path: "test-results/reviewer-dark.png",
    fullPage: true,
  });
});

test("DOCX upload has real text, clear errors, and document-local history", async ({
  page,
}) => {
  await page.goto("/deskreview");
  await page
    .getByRole("button", { name: "Open manuscript", exact: true })
    .click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "wrong.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not docx"),
    });
  await expect(page.locator(".upload-error")).toContainText(
    "Word document (.docx)",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "broken.docx",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("not a zip"),
    });
  await expect(page.locator(".upload-error")).toContainText(
    "could not be opened",
  );
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>My uploaded research</w:t></w:r></w:p><w:p><w:r><w:t>A real paragraph about local document previews.</w:t></w:r></w:p></w:body></w:document>',
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "research.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: await zip.generateAsync({ type: "nodebuffer" }),
    });
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("A real paragraph about local document previews."),
  ).toBeVisible();
  await page
    .getByLabel("Internal notes", { exact: true })
    .fill("A note for this uploaded document.");
  await expect(page.locator(".save-indicator")).toContainText(
    "Saved on this browser",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My uploaded research", level: 1 }),
  ).toBeVisible();
  await expect(page.getByLabel("Internal notes", { exact: true })).toHaveValue(
    "A note for this uploaded document.",
  );
  await page.getByRole("button", { name: /Documents & history/ }).click();
  await expect(page.locator(".history-row")).toHaveCount(2);
  await page
    .locator(".history-row")
    .filter({ hasText: sampleManuscript.title })
    .click();
  await expect(page.getByLabel("Internal notes", { exact: true })).toHaveValue(
    "",
  );
  await page.getByRole("button", { name: /Author package/ }).click();
  await expect(
    page.getByRole("button", { name: "Download accepted findings" }),
  ).toBeDisabled();
});

test("search, highlights, keyboard tabs, panel resize and expansion work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search manuscript" }).click();
  await page
    .getByRole("textbox", { name: "Find text in manuscript" })
    .fill("well-being");
  await expect(page.locator(".search-mark").first()).toBeVisible();
  await page
    .getByRole("textbox", { name: "Find text in manuscript" })
    .press("Enter");
  await expect(page.locator("#doc-abstract")).toBeInViewport();
  await page.getByRole("button", { name: "Close search" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.locator(".zoom-value")).toHaveText("110%");
  await page.getByRole("button", { name: "Highlights", exact: true }).click();
  await expect(page.locator(".passage-mark")).toHaveCount(0);
  await page.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Findings" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const separator = page.getByRole("separator");
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "53");
  const bounds = await separator.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + 120);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + 60, bounds!.y + 120);
  await page.mouse.up();
  expect(Number(await separator.getAttribute("aria-valuenow"))).toBeGreaterThan(
    53,
  );
  await page.getByRole("button", { name: "Expand manuscript" }).click();
  await expect(page.locator(".insights-panel")).not.toBeVisible();
  await page.getByRole("button", { name: "Show review panel" }).click();
  await expect(page.locator(".insights-panel")).toBeVisible();
});

test("mobile dark mode switches panes without overflow or losing selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/deskreview");
  await expect(page.getByLabel("Color theme")).toHaveValue("system");
  const dark = await page
    .locator(".desk-app")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dark).toBe("rgb(21, 27, 25)");
  await page.getByRole("button", { name: "Start reviewing" }).click();
  const first = page.locator("#finding-1");
  await first.getByRole("button", { name: "Accept", exact: true }).click();
  await first
    .getByRole("button", { name: /View passage in manuscript/ })
    .click();
  await expect(page.locator("#doc-methods")).toBeInViewport();
  expect(
    await page
      .locator(".document-paper")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(36, 44, 39)");
  await page
    .getByRole("button", { name: "Review findings", exact: true })
    .click();
  await expect(first.locator(".status-accepted")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight -
        document.querySelector(".desk-app")!.scrollHeight,
    ),
  ).toBeLessThan(4);
  await page.screenshot({
    path: "test-results/reviewer-mobile-dark.png",
    fullPage: true,
  });
  await page.getByLabel("Color theme").selectOption("light");
  await expect(page.locator(".desk-app")).toHaveAttribute(
    "data-theme",
    "light",
  );
  await expect(first.locator(".status-accepted")).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: /Documents & history/ }).click();
  await expect(
    page.getByRole("heading", { name: "Documents & review history" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("storage failures are visible and do not prevent reviewer decisions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await page.goto("/deskreview");
  await expect(page.locator(".save-indicator")).toContainText("Not saved");
  await page.getByRole("button", { name: "Start reviewing" }).click();
  await page
    .locator("#finding-1")
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await expect(page.locator("#finding-1 .status-accepted")).toBeVisible();
});
