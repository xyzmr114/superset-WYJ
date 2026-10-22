"use client";
import {useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import styles from './landing.module.css';

// Section 03: drag (or arrow-key) through the three places your information can be,
// and one brief card shows exactly what is visible there. Illustrative data.
const STOPS = [
  {name: 'Your device', who: 'Draft seen only by you'},
  {name: 'Published brief', who: 'Approved brief seen by matching and proposed counterparts'},
  {name: 'Mutual introduction', who: 'Chosen contact seen by this match, after you both approve'},
];
const BETWEEN = ['only what you approve', 'only after two yeses'];

function Hidden({children}: {children: string}) {
  return <p className={styles.hidden}><span aria-hidden="true" className={styles.redact} />{children}</p>;
}

export default function WhoSeesWhat() {
  const [stop, setStop] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const fromPointer = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    setStop(Math.round(Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * 2));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPointer(e.clientX);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = {ArrowRight: stop + 1, ArrowUp: stop + 1, ArrowLeft: stop - 1, ArrowDown: stop - 1, Home: 0, End: 2}[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setStop(Math.min(2, Math.max(0, next)));
  };

  return (
    <div className={styles.who}>
      <div className={styles.sliderWrap}>
        <div
          ref={track}
          className={styles.track}
          role="slider"
          tabIndex={0}
          aria-label="Where your information is"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={stop}
          aria-valuetext={`${STOPS[stop].name}. ${STOPS[stop].who}.`}
          onPointerDown={onPointerDown}
          onPointerMove={e => e.buttons === 1 && fromPointer(e.clientX)}
          onKeyDown={onKeyDown}
        >
          <span className={styles.trackFill} style={{width: `${stop * 50}%`}} />
          <span className={styles.thumb} style={{left: `${stop * 50}%`}} />
          {STOPS.map((s, i) => <span key={s.name} className={`${styles.tick} ${i <= stop ? styles.tickOn : ''}`} style={{left: `${i * 50}%`}} />)}
        </div>
        <div className={styles.stopLabels} aria-hidden="true">
          {STOPS.map((s, i) => (
            <button key={s.name} type="button" tabIndex={-1} className={i === stop ? styles.stopOn : ''} onClick={() => setStop(i)}>{s.name}</button>
          ))}
        </div>
        <div className={styles.betweenLabels} aria-hidden="true">
          {BETWEEN.map(b => <span key={b}>{b}</span>)}
        </div>
      </div>

      <article className={styles.seeCard} aria-live="polite">
        <p className={styles.seeWho}>{STOPS[stop].who}</p>
        <h4>Private background</h4>
        {stop === 0
          ? <p>&ldquo;Want to build booking rails for AI agents. Need six months of runway first.&rdquo;</p>
          : <Hidden>Stays on your device</Hidden>}
        <h4>Brief</h4>
        {stop === 0
          ? <p className={styles.draft}>Draft: Nova · offers engineering · seeks product. Not published until you approve it.</p>
          : <p><b>Nova</b> · offers engineering · seeks product, distribution<br />&ldquo;Building an Expedia-style booking layer for AI agents.&rdquo;</p>}
        <h4>Name and contact</h4>
        {stop === 2
          ? <p><b>Priya R.</b> · priya@example.com<br /><span className={styles.receipt}>Consent receipt · this pairing only · brief v1</span></p>
          : <Hidden>{stop === 0 ? 'Not shared. You choose it per pairing, later' : 'Hidden until you both approve this introduction'}</Hidden>}
      </article>
    </div>
  );
}
