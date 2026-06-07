// Subtle static film grain over the whole UI (tiled, rasterized SVG noise —
// no live filter, no animation). The warm flat background lives in CSS on body.
export default function AuroraBackground() {
  return <div className="grain" aria-hidden="true" />;
}
