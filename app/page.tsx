import Link from 'next/link';

// Pure-CSS stick figure that free-falls down the page. Landing page only.
function Jumper() {
  return (
    <div className="jumper-wrap" aria-hidden="true">
      <div className="jump-trail" />
      <div className="stick-person">
        <span className="stick-head" />
        <span className="stick-body" />
        <span className="stick-arm stick-arm-left" />
        <span className="stick-arm stick-arm-right" />
        <span className="stick-leg stick-leg-left" />
        <span className="stick-leg stick-leg-right" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="sky-page">
      {/* The sky background itself is in the shared layout (app/SkyScene.tsx).
          Only the landing page adds the falling figure. */}
      <Jumper />

      <section className="hero-copy">
        <p className="eyebrow">YOUR NEXT CHAPTER STARTS WITH A PERSON</p>
        <h1>What would make<br />you <em>jump?</em></h1>
        <p className="lead">Find someone you could start a company with. Explore the idea before you announce the leap.</p>
        <div className="actions">
          <Link className="button" href="/agent">Talk to your agent <span aria-hidden="true">↗</span></Link>
          <Link className="secondary" href="/join">How it works</Link>
        </div>
      </section>

      <div className="grid three">
        <article><small>01</small><h3>Your conditions stay with you.</h3><p>Private notes stay in this tab. Choose a separate card for matching.</p></article>
        <article><small>02</small><h3>Complementary beats similar.</h3><p>Match skills you offer with skills you need around a shared problem.</p></article>
        <article><small>03</small><h3>A conversation, then a company.</h3><p>Explore a shared idea and shape your first experiment together.</p></article>
      </div>
    </div>
  );
}
