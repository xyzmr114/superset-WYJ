import Elevation from './Elevation';
import WhoSeesWhat from './WhoSeesWhat';
import SkydiveScene from './SkydiveScene';
import HeroTitle from './HeroTitle';
import {Landed, Plane} from './SkydiveArt';
import type {CSSProperties} from 'react';
import styles from './landing.module.css';

const STEPS = [
  {title: 'A private brief, on your device', body: 'Write your idea and, if you like, paste your background. Skill suggestions run in your own browser, and your background never leaves it. You approve the exact brief, word for word.'},
  {title: 'An anonymous match', body: 'WYJ compares approved briefs only and proposes complementary founders under aliases, with the reasons and one small experiment to try first. No names, no contact details.'},
  {title: 'Both say yes', body: 'Interest stays private until it’s mutual. Names and the contact you choose unlock only when you both approve that one introduction.'},
];

const NEVER = [
  ['Scrape anyone’s LinkedIn', 'You paste your own profile.'],
  ['Message or book meetings for you', 'You two decide how to talk.'],
  ['Publish your brief automatically', 'It waits for your approval.'],
  ['Fall back to a cloud model', 'No local classifier? You fill it in.'],
];

// Small white clouds drifting across the whole page, forever. Each: vertical position (% of
// the page), size, seconds per crossing, and a negative delay so they start spread out.
// With reduced motion each rests where it would be in its loop (--x).
const DRIFTERS = [
  [2, 1, 46, -5], [5, 0.6, 38, -22], [9, 0.8, 52, -40], [14, 0.5, 34, -12],
  [19, 0.9, 58, -30], [24, 0.55, 40, -3], [30, 0.75, 48, -26], [36, 0.5, 36, -18],
  [42, 0.85, 54, -44], [48, 0.6, 42, -8], [55, 0.7, 50, -33], [61, 0.5, 37, -20],
  [68, 0.8, 56, -11], [74, 0.55, 41, -36], [81, 0.7, 47, -2], [88, 0.5, 39, -27],
];

function Drifters() {
  return (
    <div className={styles.drifters} aria-hidden="true">
      {DRIFTERS.map(([top, scale, secs, delay], i) => (
        <span key={i} style={{top: `${top}%`, '--scale': scale, '--x': Math.round((-delay / secs) * 100), animationDuration: `${secs}s`, animationDelay: `${delay}s`} as CSSProperties} />
      ))}
    </div>
  );
}

function Clouds({className}: {className: string}) {
  return (
    <div className={`${styles.clouds} ${className}`} aria-hidden="true">
      <span /><span /><span />
    </div>
  );
}

export default function Home() {
  return (
    <div className={styles.page} data-skydive>
      <Drifters />
      <Elevation />
      <SkydiveScene />

      {/* THE JUMP */}
      <section className={styles.hero}>
        <Clouds className={styles.cloudsHigh} />
        <div className={styles.planeWrap} data-plane>
          <Plane className={styles.plane} />
          <span className={styles.door} data-door aria-hidden="true" />
        </div>
        <p className={styles.kicker}>Private founder matchmaking</p>
        <HeroTitle />
        <p className={styles.deck}>Find your co&#8209;founder before you quit, without telling anyone you might leave.</p>
        <div className={styles.heroActions}>
          <a className={styles.scroll} href="#problem">Scroll</a>
        </div>
        <p className={styles.byline}>Built at super&#123;set&#125; · October 2026 · 3 min read</p>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.section} id="how">
        <p className={styles.tag} id="problem">01 · How it works</p>
        <h2 className={styles.h2}>Every company starts as a secret. <em>Keep it one</em> until you find the right person.</h2>
        <p className={styles.lead}>Telling your network you want a co&#8209;founder tells your employer you might leave. WYJ is a quiet way to ask.</p>
        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className={styles.stepN}>{String(i + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <ul className={styles.stats}>
          <li><b>0</b> words of your profile sent to the server</li>
          <li><b>2</b> yeses before any name is shown</li>
          <li><b>0</b> messages sent on your behalf</li>
        </ul>
      </section>

      <Clouds className={styles.cloudsMid} />

      {/* PRIVACY PROMISE */}
      <section className={styles.section}>
        <p className={styles.tag}>02 · The privacy promise</p>
        <h2 className={styles.h2}>Two yeses, <em>then</em> names.</h2>
        <p className={styles.lead}>Your plans stay on your laptop. Only a pseudonymous brief you approve meets the room, and it stays sealed until you both say yes.</p>
        <figure className={styles.figure} id="who">
          <div className={styles.panel}>
            <WhoSeesWhat />
          </div>
          <figcaption>Drag the marker. Each stop shows exactly what is visible there. Pseudonymous, not anonymous: a distinctive brief could still identify you, so you write and approve every word.</figcaption>
        </figure>
        <div className={styles.neverWrap} id="never">
          <h3 className={styles.h3}>Some things WYJ will never do.</h3>
          <ul className={styles.never}>
            {NEVER.map(([line, note]) => <li key={line}><s>{line}</s><span>{note}</span></li>)}
          </ul>
        </div>
      </section>

      <Clouds className={styles.cloudsLow} />

      {/* SUPER{SET} PITCH */}
      <section className={styles.section} id="pairing">
        <p className={styles.tag}>03 · Why super&#123;set&#125;</p>
        <h2 className={styles.h2}>Teams that form around a problem, <em>before</em> anyone announces they&apos;re leaving.</h2>
        <p className={styles.lead}>super&#123;set&#125; builds companies with founders around a focused first product. WYJ finds complementary people early and hands them a testable problem and a first experiment. That&apos;s our hypothesis, not something super&#123;set&#125; has endorsed.</p>
        <article className={styles.pairing}>
          <div className={styles.pairCards}>
            <div><strong>Nova</strong><span>Offers engineering · seeks product, distribution</span><p>Building an Expedia-style booking layer for AI agents.</p></div>
            <i aria-hidden="true">+</i>
            <div><strong>Atlas</strong><span>Offers product, distribution · seeks engineering</span><p>Exploring infrastructure for agent travel.</p></div>
          </div>
          <div className={styles.pairNotes}>
            <div><h3>Why this pair</h3><p>Each seeks exactly what the other offers, and both briefs point at agent-driven travel booking.</p></div>
            <div><h3>First 48-hour experiment</h3><p>Interview five travel agencies about how they book today. Continue only if the same pain keeps showing up.</p></div>
          </div>
          <p className={styles.caveat}>A starting hypothesis, not validated demand.</p>
        </article>
      </section>

      {/* LANDING */}
      <section className={styles.landing} id="landing">
        <p className={styles.tag}>04 · Landing</p>
        <h2 className={styles.landTitle}>So, would you <em>jump?</em></h2>
        <form className={styles.join} action="/agent" method="get">
          <button type="submit">Build my profile <span aria-hidden="true">→</span></button>
          <p className={styles.joinNote}>No account, no résumé, no announcement.</p>
        </form>
        <div className={styles.ground}>
          <span className={styles.pad} data-land aria-hidden="true" />
          <Landed className={styles.landed} />
        </div>
      </section>
    </div>
  );
}
