// Phase 6 — full integration test of the admin multi-platform system against the
// REAL Express app (temp DB). Exercises the gate, the whole provider/model/effort
// matrix, vision, image generation, persistence, and scans every response body
// for leaked keys.  node scripts/testPhase6.mjs
import os from "node:os";
import fs from "node:fs";
import zlib from "node:zlib";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const TEST_DB = resolve(os.tmpdir(), "cue_phase6_test.db");
for (const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TEST_DB + s); } catch {} }
process.env.DB_PATH = TEST_DB;
dotenv.config({ path: resolve(here, "..", "..", "..", "..", ".env") });

const { default: app } = await import("../server/index.js");
const { getUser, setAdminChatUnlocked } = await import("../server/services/users.js");
const ADMIN_ID = 1090424330;

// Valid red PNG for the vision + reference tests.
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(~c)>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length,0);const tb=Buffer.from(t,"ascii");const c=Buffer.alloc(4);c.writeUInt32BE(crc32(Buffer.concat([tb,d])),0);return Buffer.concat([l,tb,d,c]);}
function png(w,h,rgb){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;const row=Buffer.concat([Buffer.from([0]),...Array.from({length:w},()=>Buffer.from(rgb))]);const raw=Buffer.concat(Array.from({length:h},()=>row));return Buffer.concat([sig,chunk("IHDR",ih),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);}
const RED_PNG = "data:image/png;base64," + png(64, 64, [220, 30, 30]).toString("base64");

const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (t) => (typeof t === "string" ? t : JSON.stringify(t ?? "")).replace(/\s+/g, " ").trim().slice(0, 46);

const allBodies = []; // every response body, for the key-leak scan
async function call(method, path, body) {
  const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", "x-telegram-initdata": "dev" }, body: body ? JSON.stringify(body) : undefined });
  let json = null, text = "";
  try { text = await res.text(); json = JSON.parse(text); } catch {}
  allBodies.push(text);
  return { status: res.status, json };
}

let pass = 0, fail = 0, soft = 0;
const check = (n, ok, extra = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? "  — " + extra : ""}`); };
const softCheck = (n, ok, note) => { if (ok) { pass++; console.log(`PASS  ${n}`); } else { soft++; console.log(`SOFT  ${n}  — ${note}`); } };

try {
  console.log("\n================ PHASE 6 — FULL INTEGRATION ================\n");

  // ---- SECURITY: gate rejects before unlock (same 403 path as a non-admin id) ----
  console.log("-- SECURITY (unauthorized → 403) --");
  for (const [m, p, b] of [
    ["GET", "/api/admin/platforms", undefined],
    ["POST", "/api/admin/chats", { model: "x" }],
    ["POST", "/api/admin/generate-image", { prompt: "x" }],
  ]) {
    const { status, json } = await call(m, p, b);
    check(`${m} ${p} → 403`, status === 403 && json?.error === "forbidden", `status=${status}`);
  }

  getUser(ADMIN_ID);
  setAdminChatUnlocked(ADMIN_ID);

  // ---- platforms safe shape ----
  const platforms = (await call("GET", "/api/admin/platforms")).json;
  check("GET /platforms safe shape", !!(platforms?.groq && platforms?.gemini && platforms?.openrouter?.passthrough), "");

  // ---- create a chat ----
  const chatId = (await call("POST", "/api/admin/chats", { model: "openai/gpt-oss-20b:free", title: "p6" })).json?.id;
  check("create chat", !!chatId, `id=${chatId}`);
  const send = (sel, content, attachments) => call("POST", `/api/admin/chats/${chatId}/messages`, { ...sel, content, attachments });

  // ---- CHAT MATRIX ----
  console.log("\n-- CHAT MATRIX --");
  const MATRIX = [
    { name: "openrouter", sel: { platform: "openrouter", model: "openai/gpt-oss-20b:free" }, soft: true },
    { name: "groq/gpt/low", sel: { platform: "groq", model: "gpt", effort: "low" } },
    { name: "groq/gpt/high", sel: { platform: "groq", model: "gpt", effort: "high" } },
    { name: "groq/qwen", sel: { platform: "groq", model: "qwen", effort: null } },
    { name: "groq/meta/low", sel: { platform: "groq", model: "meta", effort: "low" } },
    { name: "groq/meta/high", sel: { platform: "groq", model: "meta", effort: "high" } },
    { name: "gemini/fast", sel: { platform: "gemini", model: "gemini", effort: "fast" } },
    { name: "gemini/medium", sel: { platform: "gemini", model: "gemini", effort: "medium" } },
    { name: "gemini/high", sel: { platform: "gemini", model: "gemini", effort: "high" } },
  ];
  for (const combo of MATRIX) {
    const { status, json } = await send(combo.sel, "Привет");
    const ok = status === 200 && !!json?.reply;
    if (combo.soft) softCheck(combo.name, ok, `status=${status} ${json?.error || ""} (OpenRouter free tier can be flaky)`);
    else if (status === 429) softCheck(combo.name, false, "429 rate_limit (Groq free-tier throttle under rapid calls — expected, path works)");
    else check(combo.name, ok, ok ? `"${short(json.reply)}"` : `status=${status} ${json?.error || ""} ${json?.detail || ""}`);
    await sleep(1500); // space out Groq free-tier calls
  }

  // ---- PERSISTENCE: last selection (gemini/high) restored on reopen ----
  console.log("\n-- PERSISTENCE --");
  const reopened = (await call("GET", `/api/admin/chats/${chatId}/messages`)).json;
  check("reopen restores selection", reopened?.platform === "gemini" && reopened?.model === "gemini" && reopened?.effort === "high",
    `platform=${reopened?.platform} model=${reopened?.model} effort=${reopened?.effort}`);
  check("mid-chat switches persisted (history grew)", Array.isArray(reopened?.messages) && reopened.messages.length >= 2, `msgs=${reopened?.messages?.length}`);

  // ---- VISION ----
  console.log("\n-- VISION --");
  {
    const { status, json } = await send({ platform: "groq", model: "gpt", effort: "high" }, "What single color fills this image? One word.", [{ type: "image", mime: "image/png", name: "r.png", base64: RED_PNG }]);
    check("groq image → vision (Scout)", status === 200 && !!json?.reply, status === 200 ? `"${short(json.reply)}"` : `status=${status} ${json?.error || ""}`);
    await sleep(1500);
  }
  {
    const { status, json } = await send({ platform: "gemini", model: "gemini", effort: "fast" }, "What single color fills this image? One word.", [{ type: "image", mime: "image/png", name: "r.png", base64: RED_PNG }]);
    check("gemini image → native vision", status === 200 && !!json?.reply, status === 200 ? `"${short(json.reply)}"` : `status=${status} ${json?.error || ""}`);
  }

  // ---- IMAGE GENERATION ----
  console.log("\n-- IMAGE GENERATION --");
  {
    const { status, json } = await call("POST", "/api/admin/generate-image", { prompt: "a tiny blue cube on white, product shot" });
    const ok = status === 200 && typeof json?.image === "string" && json.image.startsWith("data:image/");
    check("generate-image (prompt only)", ok, ok ? `${json.image.slice(5, json.image.indexOf(";"))}, ${Math.round(json.image.length*0.75/1024)}KB` : `status=${status} ${json?.error || ""}`);
  }
  {
    const { status, json } = await call("POST", "/api/admin/generate-image", { prompt: "make it watercolor", image: RED_PNG });
    const ok = status === 200 && typeof json?.image === "string" && json.image.startsWith("data:image/");
    check("generate-image (prompt + reference)", ok, ok ? `${Math.round(json.image.length*0.75/1024)}KB` : `status=${status} ${json?.error || ""}`);
  }

  // ---- KEY-LEAK SCAN over every response body collected above ----
  console.log("\n-- SECURITY (key-leak scan) --");
  const leakRe = /gsk_[A-Za-z0-9]|AQ\.[A-Za-z0-9]|sk-or-v1-/;
  const leaks = allBodies.filter((b) => leakRe.test(b || ""));
  check("no API keys in any response body", leaks.length === 0, `scanned ${allBodies.length} responses, ${leaks.length} leaks`);

  console.log(`\n================ ${pass} passed, ${fail} failed, ${soft} soft ================\n`);
} catch (e) {
  console.error("test error:", e?.stack || e?.message || e);
  fail++;
} finally {
  server.close();
  for (const s of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TEST_DB + s); } catch {} }
  process.exit(fail ? 1 : 0);
}
