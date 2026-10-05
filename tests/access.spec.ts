import { expect, test } from "@playwright/test";
import { createHash, createHmac } from "node:crypto";

const origin = "http://localhost:3100";

test("login fits a small mobile screen in dark mode", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Enter workspace" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/access-mobile.png", fullPage: true });
});

test("anonymous access is blocked, including API and RSC requests", async ({
  request,
}) => {
  for (const path of ["/", "/deskreview", "/deskreview?_rsc=check"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/login?next=");
  }
  expect((await request.get("/api/private")).status()).toBe(401);
  const login = await request.get("/login");
  expect(
    (await login.text()).includes(process.env.DESKREVIEW_ACCESS_KEY!),
  ).toBe(false);
});

test("invalid credentials and cross-origin login are rejected", async ({
  request,
}) => {
  const incorrect = await request.post("/api/auth/login", {
    headers: { Origin: origin },
    data: { key: "0".repeat(64) },
  });
  expect(incorrect.status()).toBe(401);
  expect(incorrect.headers()["set-cookie"]).toBeUndefined();
  const crossOrigin = await request.post("/api/auth/login", {
    headers: { Origin: "https://example.com" },
    data: { key: process.env.DESKREVIEW_ACCESS_KEY },
  });
  expect(crossOrigin.status()).toBe(403);
});

test("tampered and expired sessions cannot open the workspace", async ({
  request,
}) => {
  const version = createHash("sha256")
    .update(process.env.DESKREVIEW_ACCESS_KEY!.toLowerCase())
    .digest("hex")
    .slice(0, 16);
  const payload = `${Math.floor(Date.now() / 1000) - 60}.${"a".repeat(32)}.${version}`;
  const signature = createHmac("sha256", process.env.DESKREVIEW_SESSION_SECRET!)
    .update(payload)
    .digest("hex");
  for (const token of ["forged", `${payload}.${signature}`]) {
    const response = await request.get("/deskreview", {
      headers: { Cookie: `deskreview_session=${token}` },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
  }
});

test("session cookie is protected and return URLs stay on this website", async ({
  request,
}) => {
  const response = await request.post("/api/auth/login", {
    headers: { Origin: origin },
    data: {
      key: process.env.DESKREVIEW_ACCESS_KEY,
      next: "https://example.com",
    },
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).next).toBe("/deskreview");
  const cookie = response.headers()["set-cookie"];
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=strict");
  expect(cookie).toContain("Max-Age=28800");
  expect((await request.get("/deskreview")).status()).toBe(200);
});

test("reviewer can sign in and lock the workspace again", async ({ page }) => {
  await page.goto("/deskreview");
  await expect(
    page.getByRole("heading", { name: "Enter your access key" }),
  ).toBeVisible();
  await page
    .getByLabel("Website access key", { exact: true })
    .fill(process.env.DESKREVIEW_ACCESS_KEY!);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL(/\/deskreview$/);
  await page.getByRole("button", { name: "Lock workspace" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/deskreview");
  await expect(
    page.getByRole("heading", { name: "Enter your access key" }),
  ).toBeVisible();
});
