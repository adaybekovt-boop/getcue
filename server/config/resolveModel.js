// Resolver for the admin model registry (Phase 1 — foundation only).
//
// resolveModel(platform, model, effort) turns a (platform, model, effort)
// selection into the concrete transport + endpoint + real API model + key that
// a later phase will hand to a provider client. getPlatformsForClient() returns
// a key-free, apiModel-free shape safe to ship to the frontend dropdowns.
//
// This module performs NO network calls and does not touch existing chat or
// generation logic.
import { PLATFORMS } from "./adminPlatforms.js";

/**
 * Resolve a platform/model/effort selection to a concrete provider target.
 *
 * @returns {{ transport: string, baseUrl: string|undefined, apiModel: string|undefined, apiKey: string|undefined }}
 * @throws  Error('unknown_platform' | 'unknown_model' | 'invalid_effort' | 'missing_key: <ENV_VAR>')
 */
export function resolveModel(platform, model, effort) {
  const platformCfg = PLATFORMS[platform];
  if (!platformCfg) throw new Error("unknown_platform");

  // OpenRouter passthrough: a later phase owns OpenRouter's own model list and
  // its keys. Just hand back the transport/baseUrl and pass the model as-is.
  if (platformCfg.passthrough) {
    return {
      transport: platformCfg.transport,
      baseUrl: platformCfg.baseUrl,
      apiModel: model, // passed through unchanged
      apiKey: undefined, // caller supplies the OpenRouter key (existing logic)
    };
  }

  const modelCfg = platformCfg.models?.[model];
  if (!modelCfg) throw new Error("unknown_model");

  let apiModel;
  let keyEnv;
  if (modelCfg.hasEffort) {
    const effortCfg = effort ? modelCfg.effort?.[effort] : undefined;
    if (!effortCfg) throw new Error("invalid_effort");
    apiModel = effortCfg.apiModel;
    keyEnv = effortCfg.keyEnv;
  } else {
    // hasEffort=false -> effort is ignored, use the model's direct apiModel.
    apiModel = modelCfg.apiModel;
    keyEnv = modelCfg.keyEnv;
  }

  const apiKey = process.env[keyEnv];
  if (!apiKey || !apiKey.trim()) {
    // Name the missing env var; never include the key value.
    throw new Error(`missing_key: ${keyEnv}`);
  }

  return {
    transport: platformCfg.transport,
    // baseUrl only applies to the openai transport; undefined for gemini-native.
    baseUrl: platformCfg.transport === "openai" ? platformCfg.baseUrl : undefined,
    apiModel,
    apiKey,
  };
}

/**
 * Resolve a platform's dedicated vision model (for image inputs), if it has one.
 * Groq routes images to a vision-capable model (groq.vision = Llama 4 Scout);
 * Gemini flash models read images natively, so gemini has no `vision` entry and
 * this returns null (caller falls back to the selected text model).
 *
 * @returns same shape as resolveModel, or null when the platform has no dedicated
 *          vision model.
 * @throws  Error('unknown_platform' | 'missing_key: <ENV_VAR>')
 */
export function resolveVision(platform) {
  const platformCfg = PLATFORMS[platform];
  if (!platformCfg) throw new Error("unknown_platform");
  const v = platformCfg.vision;
  if (!v) return null; // no dedicated vision model (e.g. gemini handles it natively)

  const apiKey = process.env[v.keyEnv];
  if (!apiKey || !apiKey.trim()) throw new Error(`missing_key: ${v.keyEnv}`);

  return {
    transport: platformCfg.transport,
    baseUrl: platformCfg.transport === "openai" ? platformCfg.baseUrl : undefined,
    apiModel: v.apiModel,
    apiKey,
  };
}

/**
 * Safe shape for the frontend: labels, model ids, whether each model has effort,
 * and the effort option keys. Contains NO api model strings and NO keys.
 *
 * @returns {Object} e.g.
 *   {
 *     groq:       { label, models: [{ id, label, hasEffort, effort?:[...] }, ...] },
 *     gemini:     { label, models: [{ id:'gemini', label:'Gemini 3', hasEffort:true, effort:['fast','medium','high'] }] },
 *     openrouter: { label, passthrough:true },
 *   }
 */
export function getPlatformsForClient() {
  const out = {};
  for (const [platformId, cfg] of Object.entries(PLATFORMS)) {
    if (cfg.passthrough) {
      out[platformId] = { label: cfg.label, passthrough: true };
      continue;
    }
    const models = Object.entries(cfg.models || {}).map(([id, m]) => {
      const entry = { id, label: m.label, hasEffort: !!m.hasEffort };
      if (m.hasEffort) entry.effort = Object.keys(m.effort || {});
      return entry;
    });
    out[platformId] = { label: cfg.label, models };
  }
  return out;
}
