// Standalone connectivity test. Reads keys from the current provider pools in
// .env (never prints them). Does NOT touch app generation logic/routes.
import "dotenv/config";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const MSG = "Hello";
const TIMEOUT = 30000;
const OR_HEADERS = { "HTTP-Referer": "https://getcue.app", "X-Title": "Cue" };

const firstKey = (...names) => {
  for (const name of names) {
    const key = (process.env[name] || "").split(",")[0].trim();
    if (key) return key;
  }
  return "";
};

const tail = (key) => (key ? "..." + key.slice(-6) : "(none)");
const short = (text) => (text || "").replace(/\s+/g, " ").trim().slice(0, 50);

function errStr(error) {
  const status = error?.status || error?.response?.status;
  const msg =
    error?.error?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    String(error);
  return (status ? `${status} ` : "") + short(msg);
}

async function testGemini() {
  const key = firstKey("GEMINI_API_KEYS", "GEMINI_API_KEY");
  if (!key) return { ok: false, err: "missing key" };
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: MSG,
  });
  return { ok: true, text: response.text, keyTail: tail(key) };
}

async function testOpenAICompatible({ key, baseURL, model, headers }) {
  if (!key) return { ok: false, err: "missing key" };
  const client = new OpenAI({
    apiKey: key,
    baseURL,
    timeout: TIMEOUT,
    maxRetries: 0,
    defaultHeaders: headers,
  });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: MSG }],
    max_tokens: 64,
  });
  return {
    ok: true,
    text: response.choices?.[0]?.message?.content,
    keyTail: tail(key),
  };
}

async function run() {
  const results = [];

  results.push([
    "Gemini 2.5 Flash",
    await testGemini().catch((error) => ({ ok: false, err: errStr(error) })),
  ]);

  results.push([
    "Qwen (qwen-max)",
    await testOpenAICompatible({
      key: firstKey("QWEN_API_KEYS", "QWEN_API_KEY"),
      baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      model: "qwen-max",
    }).catch((error) => ({ ok: false, err: errStr(error) })),
  ]);

  results.push([
    "GPT-OSS 20B",
    await testOpenAICompatible({
      key: firstKey("OPENROUTER_USER_KEY"),
      baseURL: "https://openrouter.ai/api/v1",
      model: "openai/gpt-oss-20b:free",
      headers: OR_HEADERS,
    }).catch((error) => ({ ok: false, err: errStr(error) })),
  ]);

  results.push([
    "Kimi K2.6",
    await testOpenAICompatible({
      key: firstKey("OPENROUTER_ADMIN_KEY"),
      baseURL: "https://openrouter.ai/api/v1",
      model: "moonshotai/kimi-k2.6",
      headers: OR_HEADERS,
    }).catch((error) => ({ ok: false, err: errStr(error) })),
  ]);

  results.push([
    "Gemma 4 31B",
    await testOpenAICompatible({
      key: firstKey("OPENROUTER_USER_KEY"),
      baseURL: "https://openrouter.ai/api/v1",
      model: "google/gemma-4-31b-it:free",
      headers: OR_HEADERS,
    }).catch((error) => ({ ok: false, err: errStr(error) })),
  ]);

  console.log('\n-------- MODEL CONNECTIVITY ("Hello") --------');
  for (const [name, result] of results) {
    const label = name.padEnd(26);
    if (result.ok && result.text?.trim()) {
      console.log(`OK   ${label}-> "${short(result.text)}"  [key ${result.keyTail}]`);
    } else if (result.ok) {
      console.log(`FAIL ${label}-> empty response  [key ${result.keyTail}]`);
    } else {
      console.log(`FAIL ${label}-> Error: ${result.err}`);
    }
  }
  console.log("----------------------------------------------\n");
}

run();
