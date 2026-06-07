export const IMAGE_STRATEGY_CARDS = {

"midjourney": `Target: Midjourney v7 / v8.1

ARCHITECTURE: Natural language semantic parser. v7 = full feature set.
v8.1 = 4-5x faster, native 2K, but NO --oref, --cref, --no, Draft Mode.

PROMPT FORMULA (5 zones, continuous prose, under 40 words):
[Subject + specifics] [Action/context] [Medium/style] [Lighting physics] [Framing/lens]

RULES:
- Natural language only. NO comma-tag stacking.
- NO "photorealistic", "8K", "cinematic" — these dilute semantic meaning.
- Use specific numbers: "three cats" not "some cats".
- Physics-based lighting terms: "volumetric morning light", "rim lighting".

KEY PARAMETERS:
--s 250     (stylize, sweet spot for realism)
--s 750     (stylize, for artistic/stylized output)
--c 5-15    (chaos, low for consistent product/portrait runs)
--style raw (disables aesthetic processing, use for raw photography)
--v 7       (always specify version)
--oref URL --ow 100-400  (v7 only: replicate specific face/object)
--sref URL  (style reference transfer)

NEGATIVE PROMPTS: Use --no in v7. NOT supported in v8.1.`,

"flux": `Target: Flux.1 (Pro/Dev/Schnell) / Flux.2 (Pro/Dev) / Flux Kontext

ARCHITECTURE: Rectified flow transformer. Highly literal translation engine.
CRITICAL: CFG must be set to 1.0 on ALL Flux models. Never use classic CFG.
Flux Dev: guidance_scale 3.0-3.8. Flux Schnell: guidance_scale disabled/1.0.

PROMPT FORMULA (hierarchical, most important first):
[Subject + action] [Environment + depth] [Lighting modifiers] [Camera + lens specs]

RULES:
- NO negative prompt fields (causes errors in most UIs). Use positive exclusion language.
- Enclose in-image text in double quotes: says "OPEN" in bold sans-serif
- For full-body: always describe footwear + ground surface to prevent floating subjects.
- For surreal/organic styles: set guidance_scale=1.0 in prompt text.

FLUX.2 EXCLUSIVE FEATURES:
- JSON schema prompting for multi-subject complex scenes.
- HEX color injection: "wall painted in color #2ECC71"
- Multi-image reference: @image1, @image2 (up to 10 refs)

FLUX KONTEXT (editing):
Syntax: "Change [element] to [new element], keep everything else the same."

VARIANT SELECTION:
Flux.1 Pro/1.1 Pro → max quality, commercial, API only
Flux.1 Dev → research/LoRA training, high quality
Flux.1 Schnell → local fast generation, 1-4 steps
Flux.2 Pro/Dev → complex multi-subject, JSON prompting, 32B params`,

"gpt-image": `Target: GPT Image 2 (OpenAI, released April 21 2026)

ARCHITECTURE: Cognitive pre-planning autoregressive model. Plans composition
BEFORE rendering pixels. 90% accuracy on compound instructions.
Neutral color pipeline — no warm amber bias, realistic daylight whites.

PROMPT FORMULA (sparse declarative prose):
[Subject + physical attributes] [Functional action] [Spatial layout] [Lighting + camera]

RULES:
- Sparse, declarative prose. NO style-keyword stacking.
- Describe spatial relationships explicitly: "center-framed", "three-quarter turn".
- Excels at: typography, UI mockups, product layouts, neutral color.
- Weak at: artistic/fantasy (outputs appear clinical).
- Knowledge cutoff December 2025 — recent public figures need reference image.

TEXT IN IMAGE: Best-in-class. Handles multi-line, mixed fonts, CJK scripts.
EDITING: /edit endpoint with black-and-white mask inpainting.
ITERATION: Multi-turn ChatGPT conversation.

COST OPTIMIZATION: Generate at low quality ($0.005-0.02) → upscale finals to 4K.`,

"nano-banana": `Target: Nano Banana 2 (Gemini 3.1 Flash Image) / Nano Banana Pro (Gemini 3 Pro Image)
Released: February 26, 2026. Community name for Google's image generation models.

ARCHITECTURE: Gemini multimodal reasoning engine with Google Search grounding.
NB2 = fast (2-3s), high volume. NB Pro = max quality, packaging, typography.

PROMPT FORMULA (structured design brief, logical order):
[Subject + pose], [action], in [environment]. [Lighting source] from [position],
[quality of light]. [Single style reference], [camera/lens spec]. [Aspect ratio].

RULES:
- ONE clear style reference only. Multiple style keywords DEGRADE output.
- NO vague quality stacks: "photorealistic, hyperdetailed, 8K" = contradictions.
- Treat as a professional creative brief, not a tag dump.

TEXT IN IMAGE: Place in single quotes. Define font style. Define position. Max 5 words.
SEARCH GROUNDING: Model can query live Google Images for real-world visual accuracy.
REFERENCES: Up to 14 simultaneous reference images for subject consistency.
ASPECT RATIOS: Wide range 1:8 to 8:1 supported.
ITERATION: Multi-turn in Gemini app, AI Studio, Adobe Firefly.`,

"grok-aurora": `Target: Grok Aurora (xAI, autoregressive MoE network)

ARCHITECTURE: Autoregressive Mixture-of-Experts, token-by-token generation.
Sequential = more predictable layout than diffusion models.
Parses up to 1,000 characters. Best for portraits and skin texture realism.

PROMPT FORMULA (technical photographic specification):
[Subject + physical details] [Camera body + lens + aperture] [Shot framing + angle]
[Lighting setup] [Style/aesthetic]

RULES:
- Technical camera terminology over abstract quality words.
- Describe PHYSICAL elements, never say "stunning" or "beautiful".
- Under 5 second generation, good for batch runs (up to 10 images).
- Excels at: realistic skin (pores, freckles, wrinkles), portraits, fast batch.
- Weak at: complex multi-subject anatomy blending.

TEXT IN IMAGE: Short strings and logos only. No multi-line, no CJK.
REFERENCES: Up to 3 reference images for image-to-image.
ACCESS: Requires SuperGrok ($30/mo) or X Premium+ ($40/mo).`,

"stable-diffusion": `Target: Stable Diffusion 3.5 (Large 8.1B / Medium 2.5B / Large Turbo)

ARCHITECTURE: Triple encoder — CLIP-L + CLIP-G (77 token limit each) + T5-XXL
(unlimited length). Use T5-XXL for complex, detailed prompts.
Open weights — supports LoRA fine-tuning and ControlNet guidance.

PROMPT FORMULA (macro to micro, hybrid natural language + weighted keywords):
[Primary subject] [Clothing + materials] [Environment + spatial relations]
[Camera lens + aperture] [Lighting + specular details]
Optional weighting: (keyword:1.3) to boost attention.

KEY PARAMETERS:
guidance_scale: 4.5-7.0 (standard) / 1.0 (Turbo distilled)
num_inference_steps: 24-40 (standard) / 4 (Turbo)
Resolution: multiples of 16, native 1024x1024 to 2048x2048

NEGATIVE PROMPTS: Highly effective. Use to eliminate style variance.
Standard negative: "anime, cartoon, lowres, bad anatomy, deformed, mutated,
extra limbs, poorly drawn hands, poorly drawn face, blurry, jpeg artifacts,
watermark, signature"

VARIANT SELECTION:
Large (8.1B) → complex multi-subject, max quality
Medium (2.5B) → fast local inference, 9.9GB VRAM
Large Turbo → 4-step distilled, rapid iteration`,

"ideogram": `Target: Ideogram 3

ARCHITECTURE: LDM + character-level text encoder. Industry-leading typography.
90-95% text accuracy. Magic Prompt 3.0 auto-expands simple prompts.

PROMPT FORMULA:
[Typography directive in "double quotes"] [Subject + environment] [Style + lighting]

RULES:
- TEXT FIRST: Always place text content at the start in double quotes.
- Define exact font style: "Bold Sans-serif", "Gothic Blackletter", "Serif Script"
- Define spatial position: "centered at top", "lower left corner"
- Excels at: logos, packaging, posters, signage, multilingual text.

KEY API PARAMS:
style: "DESIGN" (text/flat layouts) | "REALISTIC" (photorealism)
rendering_speed: "QUALITY" (print-grade) | "TURBO" (rapid iteration)
color_palette: hex codes with weights (locks brand colors in latent space)
expand_prompt: false (disable Magic Prompt for precise control)

NEGATIVE PROMPTS: Use to remove 3D text effects, unwanted font styles, artifacts.
Example: "no 3D text, no script font, blurry, distorted hands, cartoon"

EXCLUSIVE FEATURES: Vector SVG export. Style Reference Lock. HEX color palette control.`,

"firefly": `Target: Adobe Firefly 4

ARCHITECTURE: Trained exclusively on Adobe Stock + licensed content.
100% commercially safe, enterprise IP indemnification.
Deep Creative Cloud integration: Photoshop Generative Fill, Generative Expand.

PROMPT FORMULA (narrative prose with technical photography terms):
[Subject + attributes] [Interaction/action] [Environment] [Lighting setup]
[Camera settings: lens, aperture, depth of field] [Texture details]

RULES:
- Use professional photography terms: "Rembrandt lighting", "f/2.2 aperture".
- Specify realistic physical properties to avoid "AI sheen" (plastic look).
- Excels at: commercial brand work, product photography, photorealistic portraits.
- Best used INSIDE Adobe apps for seamless Generative Fill integration.

KEY API PARAMS:
contentClass: "photo" | "art"
visualIntensity: 0.0-10.0 (style/structure reference strength)
prompt_reasoner: "quality" | "speed"
Structure > Strength: 0-100 (adherence to structural template)

NEGATIVE PROMPTS: Via negativePrompt API param.
Example: "no CGI, no plastic shine, no wax skin, distorted hands, extra fingers,
bad anatomy, mutated, lowres, watermark"

USE WHEN: Commercial output, brand campaigns, anything needing legal IP safety.`,

"kling": `Target: Kling v2 (video generation, physics-aware)

ARCHITECTURE: Physics-aware temporal diffusion with motion control transformer.
Maps natural language → body mechanics, fluid dynamics, camera coordinates.
IMAGE-TO-VIDEO: Upload reference image, describe motion only.

PROMPT FORMULA (chronological sequence):
[Subject details] [Action + motion intensity 0.0-1.0] [Environment]
[Camera movement on 6 axes] [Lighting] [Atmosphere/mood]

RULES:
- Motion intensity: 0.1-0.3 = subtle, 0.5-0.7 = active, 0.8+ = intense.
- Describe motion CHRONOLOGICALLY as temporal beats.
- Camera: horizontal, vertical, pan, tilt, roll, zoom [-10 to 10].
- Excels at: cloth physics, mechanical motion, multi-character dialogue sync.
- DIALOGUE SYNC: The subject <<<voice_1>>> said "Hello"

KEY API PARAMS:
duration: 3-15 seconds
mode: "std" (720p) | "pro" (1080p) | "4k"
camera_control: 6-axis [-10 to 10]

NEGATIVE PROMPTS: Up to 2500 chars. Crucial for video temporal artifacts.
Example: "motion blur, face distortion, warping, morphing, inconsistent physics,
floating objects, unnatural movements, extra limbs, background shifting"`,

"runway": `Target: Runway Gen-4 (video generation, World Model architecture)

ARCHITECTURE: Temporal Attention Layers for frame-to-frame consistency.
SPLIT INPUT PARADIGM: Image defines composition. Text prompt directs MOTION ONLY.

PROMPT FORMULA (active verbs + camera speed modifiers, temporal beats):
[Motion description] [Camera movement + speed] [Atmosphere changes over time]

RULES:
- DO NOT restate visual elements already in the source image.
- Text prompt = motion and camera only. Image = everything visual.
- Use POSITIVE phrasing for restrictions: "camera holds completely static"
  NOT "no camera movement" (negation triggers the action).
- Active verbs + precise speed: "slow dolly-in", "gentle drift", "rapid pan".
- Sequential temporal beats: "first X, then Y, finally Z".

KEY API PARAMS:
motion_bucket_id: 1-50 (subtle) | 100-150 (standard) | 200+ (high action)
duration: 5s or 10s (scalable to 60s)
aspect_ratio: 16:9 | 9:16 | 1:1 | 21:9
seed: lock for consistent multi-shot sequences

NEGATIVE PROMPTS: Use dedicated negative field in API only. NOT in text prompt box.
Example: "blurry, distorted, morphing, text, watermark, bad anatomy"

Director Mode: Node-based 3D camera path plotting.
Motion Brush 3.0: Per-pixel vector direction + speed mapping.
Act-Two: Facial performance capture across shots.`

};

// Target picker display config for the UI
export const IMAGE_MODEL_CONFIG = [
  { id: 'midjourney',       label: 'Midjourney',     badge: 'v7',       type: 'image' },
  { id: 'flux',             label: 'Flux',           badge: '2 Pro',    type: 'image' },
  { id: 'gpt-image',        label: 'GPT Image',      badge: '2',        type: 'image' },
  { id: 'nano-banana',      label: 'Nano Banana',    badge: '2',        type: 'image' },
  { id: 'grok-aurora',      label: 'Grok Aurora',    badge: 'xAI',      type: 'image' },
  { id: 'stable-diffusion', label: 'Stable Diff.',   badge: '3.5',      type: 'image' },
  { id: 'ideogram',         label: 'Ideogram',       badge: '3',        type: 'image' },
  { id: 'firefly',          label: 'Firefly',        badge: '4',        type: 'image' },
  { id: 'kling',            label: 'Kling',          badge: 'v2',       type: 'video' },
  { id: 'runway',           label: 'Runway',         badge: 'Gen-4',    type: 'video' },
];
