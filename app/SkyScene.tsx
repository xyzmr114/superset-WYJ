// Shared full-viewport sky background (sage + sun glow + drifting clouds).
// Rendered once in the root layout so it sits behind every page.
// The falling stick figure is NOT here — it lives only on the landing page.

function Cloud({className = ''}: {className?: string}) {
  return (
    <div aria-hidden="true" className={`cloud ${className}`}>
      <span className="cloud-puff cloud-puff-one" />
      <span className="cloud-puff cloud-puff-two" />
      <span className="cloud-puff cloud-puff-three" />
      <span className="cloud-base" />
    </div>
  );
}

export default function SkyScene() {
  return (
    <div className="sky-scene" aria-hidden="true">
      <div className="sun-glow" />
      <Cloud className="cloud-one" />
      <Cloud className="cloud-two" />
      <Cloud className="cloud-three" />
      <Cloud className="cloud-four" />
      <Cloud className="cloud-five" />
      <Cloud className="cloud-six" />
      <Cloud className="cloud-seven" />
    </div>
  );
}
