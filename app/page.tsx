import {DM_Mono, Fraunces, Libre_Franklin} from 'next/font/google';
import Elevation from './Elevation';
import WhoSeesWhat from './WhoSeesWhat';
import SkydiveScene from './SkydiveScene';
import {Landed, Plane} from './SkydiveArt';
import styles from './landing.module.css';

// Self-hosted by next/font at build time: the page makes no font requests to Google.
const display = Fraunces({subsets: ['latin'], style: ['normal', 'italic'], axes: ['opsz', 'SOFT', 'WONK'], variable: '--jump-display'});
const body = Libre_Franklin({subsets: ['latin'], variable: '--jump-body'});
const mono = DM_Mono({subsets: ['latin'], weight: ['400', '500'], variable: '--jump-mono'});

const STEPS = [
  {title: 'Start privately, on your device', body: 'Write a shareable idea and, if you like, paste your background for local skill suggestions. Background text stays on your device. Review every field before publishing.'},
  {title: 'Publish a pseudonymous brief', body: 'Only the brief you approve goes to WYJ’s matching service and proposed counterparts: nickname, idea, skills, preferences and availability. Your identity and contact are separate.'},
  {title: 'Both say yes', body: 'Choose exactly which name and contact to share for each pairing. Your counterpart receives those details only after you both approve that introduction.'},
];

const NEVER = [
  ['Scrape anyone’s LinkedIn', 'You paste your own profile.'],
  ['Message or book meetings for you', 'You two decide how to talk.'],
  ['Publish your brief automatically', 'It waits for your approval.'],
  ['Fall back to a cloud model', 'No local classifier? You fill it in.'],
];

function Clouds({className}: {className: string}) {
  return (
    <div className={`${styles.clouds} ${className}`} aria-hidden="true">
      <span /><span /><span />
    </div>
  );
}

export default function Home() {
  return (
    <div className={`${styles.page} ${display.variable} ${body.variable} ${mono.variable}`} data-skydive>
      <Elevation />
      <SkydiveScene />

      {/* THE JUMP */}
      <section className={styles.hero}>
        <Clouds className={styles.cloudsHigh} />
        <div className={styles.planeWrap}>
          <Plane className={styles.plane} />
          <span className={styles.door} data-door aria-hidden="true" />
        </div>
        <p className={styles.kicker}>Private founder matchmaking</p>
        <h1 className={styles.title}>Would you <em>jump?</em></h1>
        <p className={styles.deck}>Find your co&#8209;founder before you quit, with a brief you choose to share.</p>
        <div className={styles.heroActions}>
          <a className={styles.primary} href="/agent">Build my profile <span aria-hidden="true">→</span></a>
          <a className={styles.scroll} href="#problem">Scroll</a>
        </div>
        <p className={styles.byline}>Built at super&#123;set&#125; · October 2026 · 3 min read</p>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.section} id="how">
        <p className={styles.tag} id="problem">01 · How it works</p>
        <h2 className={styles.h2}>Explore your next chapter. <em>Choose what to share</em> before you meet.</h2>
        <p className={styles.lead}>Find complementary founders through a project nickname and an approved brief. Keep your private background out of the matching service.</p>
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
          <li><b>0</b> words of private background sent to the server</li>
          <li><b>2</b> yeses before identity and contact are revealed</li>
          <li><b>0</b> messages sent on your behalf</li>
        </ul>
      </section>

      <Clouds className={styles.cloudsMid} />

      {/* PRIVACY PROMISE */}
      <section className={styles.section}>
        <p className={styles.tag}>02 · The privacy promise</p>
        <h2 className={styles.h2}>Two yeses, <em>then</em> names.</h2>
        <p className={styles.lead}>Your background stays on your device. Publishing sends your approved pseudonymous brief to matching and potential counterparts. Your chosen identity and contact wait for mutual approval.</p>
        <figure className={styles.figure} id="who">
          <div className={styles.panel}>
            <WhoSeesWhat />
          </div>
          <figcaption>Drag the marker. Each stop shows an example of what is visible there. Pseudonymous, not anonymous: a distinctive brief could still identify you, so you write and approve every word.</figcaption>
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
