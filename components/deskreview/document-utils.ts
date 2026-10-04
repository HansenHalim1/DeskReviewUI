import JSZip from "jszip";
import type { Manuscript } from "./review-data";

export async function readDocx(file: File): Promise<Manuscript> {
  if (!file.name.toLowerCase().endsWith(".docx"))
    throw new Error("Please choose a Word document (.docx).");
  if (file.size > 4 * 1024 * 1024)
    throw new Error("Please choose a document smaller than 4 MB.");
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  let total = 0;
  for (let i = 0; i + 46 < view.byteLength; i++) {
    if (view.getUint32(i, true) !== 0x02014b50) continue;
    total += view.getUint32(i + 24, true);
    if (total > 32 * 1024 * 1024)
      throw new Error(
        "This document is too large to preview. Please use a smaller document.",
      );
    i +=
      45 +
      view.getUint16(i + 28, true) +
      view.getUint16(i + 30, true) +
      view.getUint16(i + 32, true);
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error(
      "This file could not be opened. Please save it as a DOCX document and try again.",
    );
  }
  const entry = zip.file("word/document.xml");
  if (!entry) throw new Error("This file is not a valid DOCX document.");
  const xml = new DOMParser().parseFromString(
    await entry.async("string"),
    "application/xml",
  );
  if (xml.querySelector("parsererror"))
    throw new Error(
      "The document could not be read. Try saving it again as DOCX.",
    );
  const namespace =
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraphs = Array.from(xml.getElementsByTagNameNS(namespace, "p"))
    .map((p, i) => ({
      id: `paragraph-${i}`,
      text: Array.from(p.getElementsByTagNameNS(namespace, "t"))
        .map((t) => t.textContent ?? "")
        .join(""),
      heading: /^(Heading|Title)/i.test(
        p
          .getElementsByTagNameNS(namespace, "pStyle")[0]
          ?.getAttributeNS(namespace, "val") ?? "",
      ),
    }))
    .filter((p) => p.text.trim());
  if (!paragraphs.length)
    throw new Error("This document has no readable text.");
  return {
    id: crypto.randomUUID(),
    name: file.name,
    title: paragraphs[0].text,
    authors: "Uploaded document · text preview",
    paragraphs: paragraphs.slice(1),
    sample: false,
    savedAt: new Date().toISOString(),
  };
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadBundle(
  files: { name: string; content: string }[],
) {
  const zip = new JSZip();
  files.forEach((file) => zip.file(file.name, file.content));
  downloadBlob(
    await zip.generateAsync({ type: "blob" }),
    "deskreview-author-review.zip",
  );
}
