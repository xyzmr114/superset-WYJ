import Elevation from './Elevation';
import WhoSeesWhat from './WhoSeesWhat';
import styles from './landing.module.css';

// Hand-drawn-style icons: each shape is drawn twice with a slight offset, like a pen sketch.
const sketch = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;
const ICONS = [
  // Notebook with a lock: write it privately.
  <svg key="a" viewBox="0 0 48 48" aria-hidden="true" {...sketch}><path d="M11 7.5c7-.6 17-.4 24 .3.6 9 .5 24-.2 33-7 .5-17 .4-23.6-.2-.5-9-.6-24-.2-33z" /><path d="M12 8.4c6.6-.3 16.4 0 22.4.4" opacity=".5" /><path d="M17 15h13M17 20h10" /><path d="M21 31.5c0-2.6 1.4-4 3.2-4s3.1 1.4 3.1 4" /><path d="M19.6 31.2c3-.3 6.3-.3 9.1.1l-.3 5.6c-2.9.3-5.8.3-8.6 0z" /></svg>,
  // Sparkle over chips: labels suggested on your laptop.
  <svg key="b" viewBox="0 0 48 48" aria-hidden="true" {...sketch}><path d="M24 6.5c.9 4.6 2.4 6.2 7 7.2-4.5 1-6.1 2.6-7 7.3-.9-4.7-2.5-6.3-7-7.3 4.6-1 6.1-2.6 7-7.2z" /><path d="M8.5 30.2c4.5-.4 9.6-.3 13.4.1.4 2 .4 4.3 0 6.3-4 .4-9 .4-13.3-.1-.4-2-.4-4.3-.1-6.3z" /><path d="M26.4 30.4c4.3-.4 9.2-.3 13 .1.4 2 .4 4.2 0 6.2-3.9.4-8.7.4-12.9 0-.4-2-.5-4.3-.1-6.3z" /></svg>,
  // Checked box: approve the exact brief.
  <svg key="c" viewBox="0 0 48 48" aria-hidden="true" {...sketch}><path d="M10 10.6c9.2-.7 19-.6 28 .2.7 9 .6 18 0 26.7-9.2.6-18.8.6-28-.1-.6-9-.6-18 0-26.8z" /><path d="M10.8 11.4c8.8-.3 17.6-.2 26.4.4" opacity=".5" /><path d="M16.5 24.5c2.4 1.9 4.2 3.9 5.6 6.6 3.4-6.4 7-10.6 11.6-14.2" /></svg>,
  // Two keys: two yeses unlock names.
  <svg key="d" viewBox="0 0 48 48" aria-hidden="true" {...sketch}><circle cx="14" cy="16" r="5.5" /><path d="M18 19.6c4.3 4 8.4 8.2 12.4 12.6M25 26.8l2.6-2.4M28.4 30.2l2.4-2.3" /><circle cx="34" cy="16" r="5.5" /><path d="M30 19.6c-4.3 4-8.4 8.2-12.4 12.6M23 26.8l-2.6-2.4M19.6 30.2l-2.4-2.3" /></svg>,
];

const STEPS = [
  {title: 'Write it privately', body: 'Write your idea. Optionally paste your background for local skill suggestions; your background stays on your device.'},
  {title: 'Get suggested labels', body: 'A classifier on your own laptop suggests skills and interests. You review every one.'},
  {title: 'Approve your brief', body: 'An alias, your skills and one blurb you wrote. Edit anything and the approval resets.'},
  {title: 'Two yeses, then names', body: 'See complementary founders. Names unlock only if you both say yes.'},
];

const NEVER = [
  ['Scrape anyone’s LinkedIn', 'You paste your own profile.'],
  ['Message or book meetings for you', 'You two decide how to talk.'],
  ['Publish your brief automatically', 'It waits for your approval.'],
  ['Fall back to a cloud model', 'No local classifier? You fill it in.'],
];

// Original sticker-style collage for "The rule": a jumper under a halftone canopy,
// with two consent tags. Thick cream outlines give the cut-out look.
function Parachutist({id, className = styles.collage, decorative = false}: {id: string; className?: string; decorative?: boolean}) {
  const dots = `${id}-dots`;
  const warm = `${id}-dots-warm`;
  return (
    <svg className={className} viewBox="0 0 420 460" {...(decorative ? {'aria-hidden': true} : {role: 'img', 'aria-label': 'Illustration: a stick figure floats down under a parachute, holding two tags that both read Interested'})}>
      <defs>
        <pattern id={dots} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="2.1" fill="#2b4bd8" />
        </pattern>
        <pattern id={warm} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.7" fill="#e07a5f" />
        </pattern>
      </defs>
      {/* Canopy: sticker outline, then flat fill, then halftone. */}
      <path d="M48 168 C60 70 150 22 212 22 C278 22 362 72 372 168 C330 150 300 152 262 166 C240 150 184 150 160 166 C120 152 90 150 48 168Z" fill="#ffffff" stroke="#ffffff" strokeWidth="22" strokeLinejoin="round" />
      <path d="M48 168 C60 70 150 22 212 22 C278 22 362 72 372 168 C330 150 300 152 262 166 C240 150 184 150 160 166 C120 152 90 150 48 168Z" fill="#d9e4fb" />
      <path d="M48 168 C60 70 150 22 212 22 C278 22 362 72 372 168 C330 150 300 152 262 166 C240 150 184 150 160 166 C120 152 90 150 48 168Z" fill={`url(#${dots})`} opacity=".55" />
      <path d="M160 166 C170 90 190 40 212 22 M262 166 C252 90 232 40 212 22" fill="none" stroke="#1d35a3" strokeWidth="2" opacity=".6" />
      {/* Lines */}
      <path d="M52 166 L196 318 M160 166 L203 316 M262 166 L217 316 M368 166 L224 318" stroke="#0e1621" strokeWidth="1.6" opacity=".7" />
      {/* Jumper */}
      <g stroke="#ffffff" strokeWidth="16" strokeLinecap="round" fill="none">
        <path d="M210 330 L210 384 M210 340 L178 362 M210 340 L242 362 M210 384 L188 428 M210 384 L232 428" />
      </g>
      <circle cx="210" cy="318" r="17" fill="#ffffff" />
      <g stroke="#0e1621" strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M210 330 L210 384 M210 340 L178 362 M210 340 L242 362 M210 384 L188 428 M210 384 L232 428" />
      </g>
      <circle cx="210" cy="318" r="11" fill="#0e1621" />
      {/* Consent tags */}
      <g transform="rotate(-8 92 370)">
        <rect x="40" y="352" width="118" height="36" rx="6" fill="#ffffff" stroke="#ffffff" strokeWidth="12" />
        <rect x="40" y="352" width="118" height="36" rx="6" fill="#e4ebfb" />
        <text x="99" y="375" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontSize="12" fontWeight="700" fill="#1d35a3">INTERESTED ✓</text>
      </g>
      <g transform="rotate(7 328 370)">
        <rect x="262" y="352" width="118" height="36" rx="6" fill="#ffffff" stroke="#ffffff" strokeWidth="12" />
        <rect x="262" y="352" width="118" height="36" rx="6" fill="#eef2f7" />
        <rect x="262" y="352" width="118" height="36" rx="6" fill={`url(#${warm})`} opacity=".25" />
        <text x="321" y="375" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontSize="12" fontWeight="700" fill="#b03f22">INTERESTED ✓</text>
      </g>
    </svg>
  );
}

// A wide halftone cloud bank. Variants place the puffs differently.
function CloudBank({className = ''}: {className?: string}) {
  return <div className={`${styles.bank} ${className}`} aria-hidden="true" />;
}

export default function Home() {
  return (
    <div className={styles.page}>
      <Elevation />

      {/* HERO · 30,000 ft */}
      <section className={styles.hero}>
        <CloudBank className={styles.bankHeroBack} />
        <div className={styles.heroFaller} aria-hidden="true">
          <Parachutist id="hero" className={styles.fallerArt} decorative />
        </div>
        <p className={styles.mono}>Private founder matchmaking</p>
        <h1 className={styles.title}>Would You <em>Jump?</em></h1>
        <CloudBank className={styles.bankHeroFront} />
        <p className={styles.deck}>Find your co&#8209;founder before you quit, without telling anyone you might leave.</p>
        <p className={`${styles.mono} ${styles.byline}`}>Built at super&#123;set&#125; · October 2026 · 3 min read</p>
        <a className={styles.scroll} href="#problem">Scroll</a>
      </section>

      {/* OPENING STATEMENT */}
      <section className={styles.opening}>
        <h2 className={styles.giant}>Every company starts as a secret.</h2>
        <div className={styles.column}>
          <p className={styles.lead}>The hard part usually isn&apos;t the idea. It&apos;s finding the person to build it with.</p>
          <p>If you&apos;re quietly thinking about starting something, you can&apos;t exactly post about it. Telling your network you want a co&#8209;founder tells your employer you might leave.</p>
        </div>
      </section>

      <CloudBank className={styles.bankMid} />

      {/* 01 */}
      <section className={styles.column} id="problem">
        <p className={styles.tag}>01 / The quiet problem</p>
        <h2 className={styles.h2}>The right person might be sitting a few metres away.</h2>
        <p>Two people with complementary skills can spend a whole event in the same room and never find out, because neither can say what they&apos;re really looking for.</p>
        <p>A hackathon is full of builders. What it lacks is a safe way to ask.</p>
        <p className={styles.aside}>Neither of you wants to be the first to say it out loud.</p>
        <h2 className={styles.big}>So we built a <mark>quiet</mark> way to ask.</h2>
        <p>WYJ is a private agent for founder matchmaking. <b>Your plans stay on your laptop.</b> Only a pseudonymous brief you approve ever meets the room, and names unlock only when two people both say yes.</p>
        <ul className={styles.stats}>
          <li><b>0</b> words of your profile sent to the server</li>
          <li><b>2</b> yeses before any name is shown</li>
          <li><b>0</b> messages sent on your behalf</li>
        </ul>
      </section>

      {/* 02 */}
      <section className={styles.column} id="how">
        <p className={styles.tag}>02 / How it works</p>
        <h2 className={styles.h2}>Four steps, and every one of them is yours.</h2>
      </section>
      <ol className={styles.steps}>
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <span className={styles.icon}>{ICONS[i]}</span>
            <span className={styles.stepN}>0{i + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>

      {/* FIGURE: who sees what */}
      <figure className={styles.figure} id="who">
        <div className={styles.panel}>
          <WhoSeesWhat />
        </div>
        <div className={styles.legend} aria-hidden="true">
          <span className={styles.legendA}>Your laptop</span>
          <span className={styles.legendB}>The room</span>
          <span className={styles.legendC}>Sealed</span>
        </div>
        <figcaption>Drag the marker. Each stop shows exactly what is visible there. Pseudonymous, not anonymous: a distinctive brief could still identify you, so you write and approve every word.</figcaption>
      </figure>

      <CloudBank className={styles.bankLow} />

      {/* 03 THE RULE */}
      <section className={styles.rule}>
        <div>
          <p className={styles.tag}>The rule:</p>
          <h2 className={styles.ruleTitle}>Two yeses, <em>then</em> names.</h2>
          <p className={styles.ruleLine}>Interest stays private until it&apos;s mutual.</p>
        </div>
        <Parachutist id="rule" />
      </section>

      {/* 04 EXAMPLE */}
      <section className={styles.column} id="pairing">
        <p className={styles.tag}>03 / An example</p>
        <h2 className={styles.h2}>Complementary beats similar.</h2>
        <p>WYJ reads only approved briefs. It explains why two people might build something together, and suggests one small experiment to try first.</p>
        <article className={styles.pairing}>
          <div className={styles.pairCards}>
            <div><strong>Nova</strong><span>Offers engineering · seeks product, distribution</span><p>Building an Expedia-style booking layer for AI agents.</p></div>
            <i aria-hidden="true">×</i>
            <div><strong>Atlas</strong><span>Offers product, distribution · seeks engineering</span><p>Exploring infrastructure for agent travel.</p></div>
          </div>
          <h3>Why this pair</h3>
          <p>Each seeks exactly what the other offers, and both briefs point at agent-driven travel booking.</p>
          <h3>First 48-hour experiment</h3>
          <p>Interview five travel agencies about how they book today. Continue only if the same pain keeps showing up.</p>
          <p className={styles.caveat}>A starting hypothesis, not validated demand.</p>
        </article>
      </section>

      {/* 05 NEVER */}
      <section className={styles.column} id="never">
        <p className={styles.tag}>04 / What we won&apos;t do</p>
        <h2 className={styles.h2}>Some things WYJ will never do.</h2>
        <ul className={styles.never}>
          {NEVER.map(([line, note]) => <li key={line}><s>{line}</s><span>{note}</span></li>)}
        </ul>
      </section>

      {/* LANDING · 0 ft */}
      <section className={styles.landing} id="landing">
        <div>
          <p className={styles.tag}>05 / Landing</p>
          <h2 className={styles.landTitle}>So, would you <em>jump?</em></h2>
          <form className={styles.join} action="/agent" method="get">
            <p className={styles.mono}>Your next chapter starts here</p>
            <div className={styles.joinRow}>
              
              <button type="submit">Build my profile <span aria-hidden="true">→</span></button>
            </div>
            <p className={styles.joinNote}>No account, no résumé, no announcement.</p>
          </form>
        </div>
        <svg className={styles.ground} viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#d6e2ee" d="M0 150 L120 110 L230 135 L350 80 L470 125 L590 95 L720 140 L850 85 L980 128 L1100 100 L1230 138 L1340 108 L1440 130 L1440 260 L0 260Z" />
          <path fill="#c4d3e3" d="M0 200 C240 170 420 210 720 186 C1000 166 1220 206 1440 184 L1440 260 L0 260Z" />
        </svg>
      </section>
    </div>
  );
}
