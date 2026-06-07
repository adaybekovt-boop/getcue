// Reads SiliconFlow keys from dp_api.txt, tests each, prints last-4 only.
import { readFileSync } from "fs";
import OpenAI from "openai";

const FILE = "C:/Users/windo/Desktop/dp_api.txt";
const BASE_URL = "https://api.siliconflow.com/v1";
const MODEL = "Qwen/Qwen2.5-7B-Instruct";

const raw = readFileSync(FILE, "utf-8");
const keys = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.startsWith("sk-"));

if (keys.length === 0) {
  console.error("No sk- keys found in file.");
  process.exit(1);
}

console.log(`Found ${keys.length} key(s). Testing each...\n`);

const results = [];
for (const key of keys) {
  const tag = "..." + key.slice(-6);
  try {
    const client = new OpenAI({ apiKey: key, baseURL: BASE_URL });
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: "Reply with just the word OK." }],
      max_tokens: 5,
    });
    const text = res.choices?.[0]?.message?.content ?? "(empty)";
    console.log(`[OK]   ${tag}  →  "${text.trim()}"`);
    results.push({ key, ok: true });
  } catch (err) {
    const msg = err?.message || String(err);
    console.log(`[FAIL] ${tag}  →  ${msg.slice(0, 120)}`);
    results.push({ key, ok: false });
  }
}

const valid = results.filter((r) => r.ok).map((r) => r.key);
console.log(`\nValid: ${valid.length} / ${keys.length}`);
if (valid.length > 0) {
  console.log("VALID_KEYS=" + valid.join(","));
}
