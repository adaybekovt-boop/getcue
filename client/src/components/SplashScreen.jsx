// Full-screen brand splash shown for ~3s on launch, then fades to reveal the
// app. Purely visual; the app loads its data underneath while this is on top.
export default function SplashScreen({ fadingOut }) {
  return (
    <div className={"splash" + (fadingOut ? " splash-out" : "")} aria-hidden="true">
      <div className="splash-inner">
        <div className="splash-logo">Cue</div>
        <div className="splash-tagline">AI Prompt Engineering</div>
        <div className="splash-progress">
          <span className="splash-progress-bar" />
        </div>
      </div>
    </div>
  );
}
