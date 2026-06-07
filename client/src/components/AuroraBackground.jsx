// Violet Smoke Aura — the hero visual of the app. Four fixed layers behind all
// content (z-index 0): main aura, drift, vignette, plus a hidden SVG turbulence
// filter that gives the main aura its organic smoke edge.
export default function AuroraBackground() {
  return (
    <>
      {/* Hidden SVG filter — referenced by .aura-main via filter: url(#cue-smoke) */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <filter id="cue-smoke">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.012 0.008"
            numOctaves="4"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="55"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div className="aura-main" aria-hidden="true" />
      <div className="aura-drift" aria-hidden="true" />
      <div className="aura-vignette" aria-hidden="true" />

      {/* Static film grain overlaying the whole UI (cheap: a tiled, rasterized
          SVG noise image — no live filter, no animation). */}
      <div className="grain" aria-hidden="true" />
    </>
  );
}
