"use client";
import {Fragment, useEffect, useRef, type CSSProperties} from 'react';
import styles from './landing.module.css';

// "Would you jump?" reacts to the pointer: letters near it lift and lean toward it, and
// hovering (or tapping) "jump?" makes those letters hop one after another. Each letter is
// two spans: the outer one follows the pointer, the inner one plays the hop. Screen readers
// get the plain heading text; reduced motion turns both effects off.
const WORDS = [{text: 'Would', jump: false}, {text: 'you', jump: false}, {text: 'jump?', jump: true}];
const REACH = 170;
const LIFT = 0.16; // em

export default function HeroTitle() {
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const node = title.current;
    if (!node) return;
    const letters = Array.from(node.querySelectorAll<HTMLElement>('[data-letter]'));
    const jump = node.querySelector<HTMLElement>('[data-jump]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0, px = 0, py = 0, active = false;

    const draw = () => {
      raf = 0;
      for (const el of letters) {
        if (!active || motion.matches) { el.style.transform = ''; continue; }
        const r = el.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        const pull = Math.max(0, 1 - Math.hypot(dx, dy) / REACH);
        const eased = pull * pull * (3 - 2 * pull);
        el.style.transform = eased
          ? `translate(${(dx / REACH) * 0.06 * eased}em, ${-LIFT * eased}em) rotate(${(dx / REACH) * -8 * eased}deg)`
          : '';
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      px = e.clientX; py = e.clientY; active = true; schedule();
    };
    const leave = () => { active = false; schedule(); };
    const hop = () => {
      if (!jump || motion.matches) return;
      jump.classList.remove(styles.hop);
      void jump.offsetWidth; // restart the animation if it is already playing
      jump.classList.add(styles.hop);
    };
    const done = (e: AnimationEvent) => {
      if (e.target === letters[letters.length - 1]?.firstElementChild) jump?.classList.remove(styles.hop);
    };

    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', leave);
    node.addEventListener('click', hop);
    jump?.addEventListener('pointerenter', hop);
    node.addEventListener('animationend', done);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
      node.removeEventListener('click', hop);
      jump?.removeEventListener('pointerenter', hop);
      node.removeEventListener('animationend', done);
    };
  }, []);

  let index = 0;
  return (
    <h1 ref={title} className={`${styles.title} ${styles.liveTitle}`} aria-label="Would you jump?">
      {WORDS.map((word, w) => {
        const letters = [...word.text].map(ch => {
          const i = word.jump ? index++ : 0;
          return (
            <span key={`${w}-${ch}-${i}`} className={styles.letter} data-letter aria-hidden="true">
              <span className={styles.letterInner} style={{'--i': i} as CSSProperties}>{ch}</span>
            </span>
          );
        });
        const inner = word.jump ? <em data-jump>{letters}</em> : letters;
        return <Fragment key={word.text}><span className={styles.word}>{inner}</span>{w < WORDS.length - 1 ? ' ' : null}</Fragment>;
      })}
    </h1>
  );
}
