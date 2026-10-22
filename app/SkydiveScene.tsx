"use client";
import {useEffect, useRef} from 'react';
import {Jumper} from './SkydiveArt';
import styles from './landing.module.css';

// The jumper leaves the plane door ([data-door]), falls, opens the canopy, sways down the
// page and lands on [data-land] by the final call to action. Position is a pure function
// of scroll, recomputed once per animation frame. With reduced motion (or no JS) the
// page shows a static landed figure instead; see .motion in landing.module.css.
const FALL = 0.1, OPEN = 0.16, SETTLE = 0.26, FLARE = 0.88;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export default function SkydiveScene() {
  const jumper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = jumper.current;
    const page = node?.closest<HTMLElement>('[data-skydive]');
    const door = page?.querySelector<HTMLElement>('[data-door]');
    const land = page?.querySelector<HTMLElement>('[data-land]');
    if (!node || !page || !door || !land) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;

    const draw = () => {
      raf = 0;
      const vw = window.innerWidth, vh = window.innerHeight;
      const size = node.offsetWidth;
      const d = door.getBoundingClientRect(), l = land.getBoundingClientRect();
      // Landed when the landing pad reaches 70% of the viewport.
      const landAt = l.top + window.scrollY - vh * 0.7;
      const p = landAt > 0 ? clamp(window.scrollY / landAt) : 1;
      const doorX = d.left + d.width / 2, doorY = d.top + d.height / 2;
      const driftY = vh * 0.36;
      const reach = Math.min(vw * 0.36, 520);
      const swayT = span(p, OPEN, FLARE);
      const swayX = vw / 2 - reach * Math.sin(swayT * Math.PI * 3);
      const lean = Math.cos(swayT * Math.PI * 3) * 9;

      let x: number, y: number, rot: number;
      if (p < OPEN) {
        const t = span(p, 0, FALL);
        x = doorX + t * 30;
        y = mix(doorY, driftY, ease(t)) + (p > FALL ? Math.sin(span(p, FALL, OPEN) * Math.PI) * 18 : 0);
        rot = t * 160 * (1 - span(p, FALL, OPEN));
      } else {
        const w = ease(span(p, OPEN, SETTLE));
        x = mix(doorX + 30, swayX, w);
        y = driftY + Math.sin(p * 40) * 4;
        rot = lean * w;
      }
      if (p > FLARE) {
        const t = ease(span(p, FLARE, 1));
        x = mix(x, l.left + l.width / 2, t);
        y = mix(y, l.top - size * 0.68, t);
        rot = mix(rot, 0, t);
      }
      if (p >= 1) { x = l.left + l.width / 2; y = l.top - size * 0.68; }
      x = clamp(x, size / 2 + 8, vw - size / 2 - 8);

      page.toggleAttribute('data-landed', p >= 0.985);
      node.style.setProperty('--open', String(ease(span(p, FALL, OPEN))));
      node.style.setProperty('--fold', String(ease(span(p, 0.97, 1))));
      // Starts small in the door, full size once clear of the plane.
      const scale = mix(0.55, 1, ease(span(p, 0, FALL)));
      node.style.transform = `translate3d(${x - size / 2}px, ${y - size * 0.7}px, 0) rotate(${rot}deg) scale(${scale})`;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const apply = () => {
      page.classList.toggle(styles.motion, !reduce.matches);
      if (reduce.matches) { cancelAnimationFrame(raf); raf = 0; } else draw();
    };

    apply();
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    reduce.addEventListener('change', apply);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reduce.removeEventListener('change', apply);
      page.classList.remove(styles.motion);
      page.removeAttribute('data-landed');
    };
  }, []);

  return (
    <div ref={jumper} className={styles.jumper} aria-hidden="true">
      <Jumper className={styles.jumperArt} />
    </div>
  );
}
