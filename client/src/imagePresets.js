// Trending image-prompt presets. Tapping a card fills the task field with a
// ready-made trend brief and selects the recommended target model — zero-friction
// entry into the image flow, and the trends double as marketing hooks.
//
// `gradient` drives the card's preview tile (no image assets shipped).
// `emoji` is the focal glyph. `task` is the prefilled brief. `model` is the
// recommended target model id (must exist in imageModels.js).

export const IMAGE_PRESETS = [
  {
    id: "toy-figure",
    title: "Toy Figure",
    tag: "🔥 Trending",
    emoji: "🧸",
    gradient: "linear-gradient(135deg, #ff8a3d 0%, #e8622a 100%)",
    model: "nano-banana",
    task:
      "Turn the person in this photo into a collectible toy figure inside clear blister packaging, like a boxed action figure. Keep the face recognizable. Add a printed cardback with a fun name label and small accessory icons. Studio product lighting, hyper-detailed plastic texture, photorealistic.",
  },
  {
    id: "2000s-camcorder",
    title: "2000s Camcorder",
    tag: "🔥 Trending",
    emoji: "📼",
    gradient: "linear-gradient(135deg, #5b7cfa 0%, #2b3a8f 100%)",
    model: "nano-banana",
    task:
      "Recreate this photo as a frame from an early-2000s camcorder home video. Add a visible timestamp overlay in the corner, slight CRT distortion, low resolution, harsh on-camera flash, motion blur and faded VHS colors. Nostalgic, chaotic, authentic.",
  },
  {
    id: "cinematic-portrait",
    title: "Cinematic Portrait",
    tag: "Popular",
    emoji: "🎬",
    gradient: "linear-gradient(135deg, #3a3f4a 0%, #14161b 100%)",
    model: "midjourney",
    task:
      "Transform this into a cinematic portrait with dramatic side lighting, shallow depth of field, teal-and-orange color grade, film grain and anamorphic flares. Moody, high-contrast, movie-still quality, 35mm look.",
  },
  {
    id: "vintage-film",
    title: "Vintage Film",
    tag: "Popular",
    emoji: "🎞️",
    gradient: "linear-gradient(135deg, #c9a36a 0%, #7a5a32 100%)",
    model: "flux",
    task:
      "Give this photo an imperfect vintage film look: warm faded colors, visible grain, light leaks, subtle scratches, soft focus and accidental blur. Make it feel like a rediscovered analog photograph, emotional and human.",
  },
  {
    id: "anime-style",
    title: "Anime Style",
    tag: "Popular",
    emoji: "🌸",
    gradient: "linear-gradient(135deg, #ff7eb3 0%, #b14bd8 100%)",
    model: "midjourney",
    task:
      "Reimagine the person in this photo as a high-quality anime character. Clean line art, expressive eyes, soft cel shading, vibrant colors and a detailed background. Studio-anime film quality, keep the pose and key features.",
  },
  {
    id: "3d-pixar",
    title: "3D Character",
    tag: "Popular",
    emoji: "🧑‍🎨",
    gradient: "linear-gradient(135deg, #4fd1c5 0%, #2b8a82 100%)",
    model: "nano-banana",
    task:
      "Turn this person into a charming stylized 3D animated character, like a modern animation-studio render. Big expressive eyes, soft rounded features, subsurface skin shading, warm cinematic lighting. Keep them recognizable.",
  },
  {
    id: "pro-headshot",
    title: "Pro Headshot",
    tag: "Useful",
    emoji: "💼",
    gradient: "linear-gradient(135deg, #6b7280 0%, #2c333d 100%)",
    model: "flux",
    task:
      "Convert this into a clean professional LinkedIn headshot. Neutral studio background, soft flattering lighting, sharp focus, business-casual look, confident natural expression. Keep the face accurate and realistic.",
  },
  {
    id: "fantasy-epic",
    title: "Epic Fantasy",
    tag: "Fun",
    emoji: "🐉",
    gradient: "linear-gradient(135deg, #9b5de5 0%, #3a2270 100%)",
    model: "midjourney",
    task:
      "Place the person into an epic fantasy scene as a heroic character — intricate armor or robes, dramatic landscape, magical atmosphere, volumetric light and rich detail. Concept-art quality, painterly, cinematic.",
  },
];
