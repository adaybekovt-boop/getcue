import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  IconStarFilled,
  IconPhotoPlus,
  IconPencil,
  IconEraser,
  IconX,
  IconChevronDown,
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconDownload,
} from "@tabler/icons-react";
import { api } from "../api.js";
import { tgUser } from "../tgUser.js";
import Avatar from "../components/Avatar.jsx";
import ImageTargetSheet from "../components/ImageTargetSheet.jsx";
import { IMAGE_MODEL_BY_ID, iconForType } from "../imageModels.js";
import { IMAGE_PRESETS } from "../imagePresets.js";

const COST = 100;
const MAX_TASK = 2000;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MERGE_MAX_DIM = 1600; // cap merged image resolution to bound payload

export default function ImagePromptScreen({ me, setCredits }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [task, setTask] = useState("");
  const [targetModel, setTargetModel] = useState("midjourney");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  // Prompt → Image (admin only) — separate state so Image → Prompt is untouched.
  const [mode, setMode] = useState("i2p"); // 'i2p' = Image→Prompt | 'p2i' = Prompt→Image
  const [genPrompt, setGenPrompt] = useState("");
  const [refImage, setRefImage] = useState(null);
  const [genResult, setGenResult] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const strokingRef = useRef(false);
  const refFileRef = useRef(null);

  const isAdmin = !!(me && me.isAdmin);
  // Same gate as the backend: admin + chat unlocked (both reflected on /api/me).
  const canGenImage = !!(me && me.adminChatUnlocked);
  const credits = me ? me.credits : null;
  const model = IMAGE_MODEL_BY_ID[targetModel];
  const ModelIcon = iconForType(model.type);

  // One input = one result.
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [imageSrc, task, targetModel]);

  // Prompt → Image: editing the prompt / reference, or switching mode, clears
  // the previously generated image.
  useEffect(() => {
    setGenResult(null);
    setGenError(null);
  }, [genPrompt, refImage, mode]);

  // Keep the annotation canvas locked to the rendered image size so it never
  // drifts or shifts the layout when the viewport changes (e.g. keyboard open).
  useEffect(() => {
    if (!imageSrc || typeof ResizeObserver === "undefined") return undefined;
    const img = imgRef.current;
    if (!img) return undefined;
    const ro = new ResizeObserver(() => syncCanvas());
    ro.observe(img);
    return () => ro.disconnect();
  }, [imageSrc]);

  // --- File upload ---
  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("invalid_image");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("image_too_large");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setDrawing(false);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageSrc(null);
    setDrawing(false);
    setResult(null);
  }

  // Tap a trend card → prefill the brief + recommended model. Tap again to clear.
  function applyPreset(preset) {
    if (activePreset === preset.id) {
      setActivePreset(null);
      setTask("");
      return;
    }
    setActivePreset(preset.id);
    setTask(preset.task);
    if (preset.model && IMAGE_MODEL_BY_ID[preset.model]) {
      setTargetModel(preset.model);
    }
  }

  // --- Canvas sizing + annotation drawing ---
  function syncCanvas() {
    const img = imgRef.current;
    const c = canvasRef.current;
    if (!img || !c) return;
    const w = Math.round(img.clientWidth);
    const h = Math.round(img.clientHeight);
    if (!w || !h || (c.width === w && c.height === h)) return;
    // Preserve any existing annotation, rescaled to the new size, so the canvas
    // can re-match the image (e.g. on a viewport change) without losing strokes
    // or drifting out of alignment.
    let prev = null;
    if (c.width && c.height) {
      prev = document.createElement("canvas");
      prev.width = c.width;
      prev.height = c.height;
      prev.getContext("2d").drawImage(c, 0, 0);
    }
    c.width = w;
    c.height = h;
    if (prev) {
      c.getContext("2d").drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, w, h);
    }
  }

  function strokePos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startStroke(e) {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#E8622A";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const p = strokePos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    strokingRef.current = true;
    canvasRef.current.setPointerCapture?.(e.pointerId);
  }

  function moveStroke(e) {
    if (!drawing || !strokingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = strokePos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function endStroke() {
    strokingRef.current = false;
  }

  function clearAnnotations() {
    const c = canvasRef.current;
    if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
  }

  // --- Merge image + annotations into one JPEG data URL ---
  function mergeImage() {
    const img = imgRef.current;
    const ann = canvasRef.current;
    const natW = img.naturalWidth || img.clientWidth;
    const natH = img.naturalHeight || img.clientHeight;
    const scale = Math.min(1, MERGE_MAX_DIM / Math.max(natW, natH));
    const outW = Math.max(1, Math.round(natW * scale));
    const outH = Math.max(1, Math.round(natH * scale));
    const off = document.createElement("canvas");
    off.width = outW;
    off.height = outH;
    const ctx = off.getContext("2d");
    ctx.drawImage(img, 0, 0, outW, outH);
    if (ann && ann.width && ann.height) {
      ctx.drawImage(ann, 0, 0, ann.width, ann.height, 0, 0, outW, outH);
    }
    return off.toDataURL("image/jpeg", 0.9);
  }

  async function handleGenerate() {
    if (!imageSrc || !task.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const merged = mergeImage();
      const data = await api("/api/generate-image-prompt", {
        method: "POST",
        body: JSON.stringify({ imageBase64: merged, targetModel, task: task.trim() }),
      });
      setResult(data.prompt);
      if (typeof data.creditsLeft === "number") setCredits(data.creditsLeft);
    } catch (e) {
      if (e.status === 402) setError("insufficient_credits");
      else if (e.status === 400) setError("invalid_input");
      else setError(e.message || "generation_failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  // --- Prompt → Image (admin) ---
  function onRefFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setGenError("invalid_image");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setGenError("image_too_large");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRefImage(reader.result);
      setGenResult(null);
      setGenError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerateImage() {
    const p = genPrompt.trim();
    if (!p || genLoading) return;
    setGenLoading(true);
    setGenError(null);
    setGenResult(null);
    try {
      const body = { prompt: p };
      if (refImage) body.image = refImage; // optional reference as a data URL
      const data = await api("/api/admin/generate-image", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setGenResult(data.image);
    } catch (e) {
      if (e.status === 429 || e.data?.error === "rate_limit") setGenError("rate_limit");
      else if (e.status === 403) setGenError("forbidden");
      else if (e.status === 400)
        setGenError(e.data?.error === "image_too_large" ? "image_too_large" : "invalid_input");
      else setGenError("generation_failed");
    } finally {
      setGenLoading(false);
    }
  }

  const disabled = loading || !imageSrc || !task.trim();

  return (
    <div className="screen">
      <header className="cue-header">
        <span className="cue-logo">Cue</span>
        <div className="header-right">
          <Link to="/pro" className="credits-badge">
            <IconStarFilled className="star" size={12} />
            {isAdmin ? "Admin ∞" : `${credits ?? "…"} cr`}
          </Link>
          <Link to="/settings" className="profile-avatar" aria-label="Profile">
            <Avatar user={tgUser} size={36} />
          </Link>
        </div>
      </header>

      <div className="screen-content">
        {/* Mode toggle */}
        <div className="mode-toggle">
          <Link to="/" className="mode-seg">
            Text → Prompt
          </Link>
          <button
            type="button"
            className={"mode-seg" + (mode === "i2p" ? " active" : "")}
            onClick={() => setMode("i2p")}
          >
            Image → Prompt
          </button>
          {canGenImage && (
            <button
              type="button"
              className={"mode-seg" + (mode === "p2i" ? " active" : "")}
              onClick={() => setMode("p2i")}
            >
              Prompt → Image
            </button>
          )}
        </div>

        {mode === "i2p" && (
          <>
        {/* Image area */}
        {!imageSrc ? (
          <button
            type="button"
            className="upload-zone"
            onClick={() => fileRef.current?.click()}
          >
            <IconPhotoPlus size={40} stroke={1.4} />
            <span className="uz-title">Tap to add image</span>
            <span className="uz-sub">JPG, PNG up to 10MB</span>
          </button>
        ) : (
          <div className="img-wrap">
            <img
              ref={imgRef}
              className="img-preview"
              src={imageSrc}
              alt="upload"
              onLoad={syncCanvas}
            />
            <canvas
              ref={canvasRef}
              className={"annot-canvas" + (drawing ? " drawing" : "")}
              onPointerDown={startStroke}
              onPointerMove={moveStroke}
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
              onPointerCancel={endStroke}
            />
            <button
              type="button"
              className="img-remove"
              onClick={removeImage}
              aria-label="Remove image"
            >
              <IconX size={16} stroke={2.2} />
            </button>
            <div className="img-tools">
              <button
                type="button"
                className="img-tool"
                onClick={clearAnnotations}
                aria-label="Clear annotations"
              >
                <IconEraser size={18} stroke={1.8} />
              </button>
              <button
                type="button"
                className={"img-tool" + (drawing ? " active" : "")}
                onClick={() => setDrawing((d) => !d)}
                aria-label="Toggle drawing"
                aria-pressed={drawing}
              >
                <IconPencil size={18} stroke={1.8} />
              </button>
            </div>
          </div>
        )}

        {/* Trending style presets */}
        <div className="preset-section">
          <div className="preset-head">
            <span className="preset-title">Trending styles</span>
            <span className="preset-hint">Tap to apply</span>
          </div>
          <div className="preset-row">
            {IMAGE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={"preset-card" + (activePreset === p.id ? " active" : "")}
                onClick={() => applyPreset(p)}
              >
                <span className="preset-thumb" style={{ background: p.gradient }}>
                  <span className="preset-emoji">{p.emoji}</span>
                  {p.tag && <span className="preset-tag">{p.tag}</span>}
                </span>
                <span className="preset-name">{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Task input */}
        <textarea
          className="img-task"
          placeholder="Describe what you want to create..."
          value={task}
          maxLength={MAX_TASK}
          onChange={(e) => {
            setTask(e.target.value);
            if (activePreset) setActivePreset(null);
          }}
        />

        {error && (
          <div className="error-banner">
            <span>
              {error === "insufficient_credits"
                ? "Not enough credits (100 needed)."
                : error === "image_too_large"
                ? "Image too large (max 10MB)."
                : error === "invalid_image"
                ? "Please choose an image file."
                : "Generation failed. Please try again."}
            </span>
            {error === "insufficient_credits" && (
              <Link to="/pro" className="link">
                Get credits →
              </Link>
            )}
          </div>
        )}

        {result && (
          <div className="output">
            <div className="output-head">
              <span className="output-title">Prompt for {model.label}</span>
              <button className="copy-btn" type="button" onClick={copyResult}>
                {copied ? (
                  <>
                    <IconCheck size={13} stroke={2} /> Copied
                  </>
                ) : (
                  <>
                    <IconCopy size={13} stroke={2} /> Copy
                  </>
                )}
              </button>
            </div>
            <pre className="output-text">{result}</pre>
          </div>
        )}
          </>
        )}

        {mode === "p2i" && (
          <>
            <textarea
              className="img-task"
              placeholder="Describe the image to generate..."
              value={genPrompt}
              maxLength={MAX_TASK}
              onChange={(e) => setGenPrompt(e.target.value)}
            />
            {!refImage ? (
              <button
                type="button"
                className="upload-zone gen-ref-zone"
                onClick={() => refFileRef.current?.click()}
              >
                <IconPhotoPlus size={28} stroke={1.4} />
                <span className="uz-title">Add reference image (optional)</span>
                <span className="uz-sub">JPG, PNG up to 10MB</span>
              </button>
            ) : (
              <div className="img-wrap">
                <img className="img-preview" src={refImage} alt="reference" />
                <button
                  type="button"
                  className="img-remove"
                  onClick={() => setRefImage(null)}
                  aria-label="Remove reference"
                >
                  <IconX size={16} stroke={2.2} />
                </button>
              </div>
            )}
            <div className="gen-hint">via gemini-2.5-flash-image</div>
            {genError && (
              <div className="error-banner">
                <span>
                  {genError === "rate_limit"
                    ? "Rate limited — try again."
                    : genError === "image_too_large"
                      ? "Image too large (max 10MB)."
                      : genError === "invalid_image"
                        ? "Please choose an image file."
                        : genError === "forbidden"
                          ? "Admin access required."
                          : "Generation failed. Please try again."}
                </span>
              </div>
            )}
            {genResult && (
              <div className="gen-result">
                <div className="gen-image-wrap">
                  <img className="gen-image" src={genResult} alt="generated" />
                </div>
                <a className="gen-download" href={genResult} download="cue-image.png">
                  <IconDownload size={15} stroke={1.9} /> Download
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {mode === "i2p" ? (
        <>
          <div className="cost-hint">{COST} credits</div>

          <div className="action-bar">
            <button
              type="button"
              className="model-selector"
              onClick={() => setShowSheet(true)}
            >
              <ModelIcon className="ms-icon" size={15} stroke={1.8} />
              <span className="ms-name">{model.label}</span>
              <IconChevronDown className="ms-chevron" size={10} stroke={2.5} />
            </button>

            <button
              type="button"
              className={"generate-btn" + (loading ? " loading" : "")}
              disabled={disabled}
              onClick={handleGenerate}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                <>
                  Generate
                  <IconArrowRight size={17} stroke={2} />
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="action-bar">
          <button
            type="button"
            className={"generate-btn" + (genLoading ? " loading" : "")}
            disabled={genLoading || !genPrompt.trim()}
            onClick={handleGenerateImage}
          >
            {genLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                Generate image
                <IconArrowRight size={17} stroke={2} />
              </>
            )}
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
      />

      <input
        ref={refFileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onRefFile}
      />

      <ImageTargetSheet
        isOpen={showSheet}
        currentModel={targetModel}
        onSelect={setTargetModel}
        onClose={() => setShowSheet(false)}
      />
    </div>
  );
}
