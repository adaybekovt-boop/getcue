// Extract plain text from uploaded files for the admin chat. OpenRouter doesn't
// natively ingest documents for Kimi, so we extract server-side and inject the
// text. PDFs via pdf-parse, .docx via mammoth, everything else as UTF-8.
import mammoth from "mammoth";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Import pdf-parse's lib entry directly — the package index runs debug code that
// reads a sample PDF on load and throws under ESM/bundlers.
let pdfParse = null;
try {
  pdfParse = require("pdf-parse/lib/pdf-parse.js");
} catch {
  try {
    pdfParse = require("pdf-parse");
  } catch {
    pdfParse = null;
  }
}

const MAX_CHARS = 24000; // ~6000 tokens
const NULL_BYTES = new RegExp("\\x00", "g");

function stripDataUrl(b64) {
  const i = b64.indexOf("base64,");
  return i >= 0 ? b64.slice(i + 7) : b64;
}

export async function extractFileText(name, mime, base64) {
  const buf = Buffer.from(stripDataUrl(base64 || ""), "base64");
  const ext = (name.split(".").pop() || "").toLowerCase();
  let text = "";

  if (ext === "pdf" || /pdf/.test(mime || "")) {
    if (!pdfParse) throw new Error("pdf parser unavailable");
    const parsed = await pdfParse(buf);
    text = parsed.text || "";
  } else if (ext === "docx" || /wordprocessingml/.test(mime || "")) {
    const parsed = await mammoth.extractRawText({ buffer: buf });
    text = parsed.value || "";
  } else {
    // txt / md / code / json / csv / etc.
    text = buf.toString("utf-8");
  }

  text = text.replace(NULL_BYTES, "").trim();
  if (!text) text = "(no extractable text)";
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + "\n\n[...truncated; original file was longer]";
  }
  return text;
}
