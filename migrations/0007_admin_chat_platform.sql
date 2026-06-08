-- Per-chat admin model selection across platforms (Phase 3).
-- The existing `model` column is REUSED: it holds the OpenRouter model id when
-- platform = 'openrouter', or the registry model key ('gpt'/'qwen'/'meta'/'gemini')
-- for platform 'groq'/'gemini'. Existing rows are OpenRouter, so default platform
-- to 'openrouter' (defaulting them to 'groq' would break resolveModel on their
-- stored OpenRouter model ids).
ALTER TABLE admin_chats ADD COLUMN platform TEXT NOT NULL DEFAULT 'openrouter';
ALTER TABLE admin_chats ADD COLUMN effort TEXT DEFAULT 'high';
