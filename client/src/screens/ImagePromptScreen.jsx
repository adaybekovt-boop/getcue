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
} from "@tabler/icons-react";
import { api } from "../api.js";
import { tgUser } from "../tgUser.js";
import Avatar from "../components/Avatar.jsx";
import ImageTargetSheet from "../components/ImageTargetSheet.jsx";
import { IMAGE_MODEL_BY_ID, iconForType } from "../imageModels.js";

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

  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const strokingRef = useRef(false);

  const isAdmin = !!(me && me.isAdmin);
  const credits = me ? me.credits : null;
  const model = IMAGE_MODEL_BY_ID[targetModel];
  const ModelIcon = iconForType(model.type);

  // One input = one result.
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [imageSrc, task, targetModel]);

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

  // --- Canvas sizing + annotation drawing ---
  function syncCanvas() {
    const img = imgRef.current;
    const c = canvasRef.current;
    if (!img || !c) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h; // resizing clears the canvas (fresh image = no strokes)
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
          <span className="mode-seg active">Image → Prompt</span>
        </div>

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

        {/* Task input */}
        <textarea
          className="img-task"
          placeholder="Describe what you want to create..."
          value={task}
          maxLength={MAX_TASK}
          onChange={(e) => setTask(e.target.value)}
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
      </div>

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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
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
