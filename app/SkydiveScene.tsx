"use client";
import {useEffect, useRef} from 'react';
import {Jumper} from './SkydiveArt';
import styles from './landing.module.css';

// The plane ([data-plane]) flies left to right as the page scrolls, carrying the jumper in
// its door ([data-door]). After RIDE of a viewport the jumper leaves, falls, opens the
// canopy, sways down the page and lands on [data-land] by the final call to action, while
// the plane flies on and out. Everything is a pure function of scroll, once per frame. With reduced motion (or no JS) the
// page shows a static landed figure instead; see .motion in landing.module.css.
const FALL = 0.1, OPEN = 0.16, SETTLE = 0.26, FLARE = 0.88;
// Plane centre as a fraction of the viewport width: start, at the jump, and gone.
const RIDE = 0.45, PLANE_FROM = 0.16, PLANE_JUMP = 0.62, PLANE_GONE = 1.35;
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
    const plane = page?.querySelector<HTMLElement>('[data-plane]');
    if (!node || !page || !door || !land) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;

    const draw = () => {
      raf = 0;
      if (reduce.matches) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const size = node.offsetWidth;
      const sy = window.scrollY, ride = vh * RIDE;
      // Plane: held in view and carried across by scroll until the jump, then it scrolls away
      // with the page while flying on out of view.
      const planeW = plane?.offsetWidth ?? 0;
      if (plane) {
        const toJump = span(sy, 0, ride), away = span(sy, ride, ride + vh * 0.9);
        const cx = vw * (away > 0 ? mix(PLANE_JUMP, PLANE_GONE, ease(away)) : mix(PLANE_FROM, PLANE_JUMP, toJump));
        const hostLeft = plane.offsetParent?.getBoundingClientRect().left ?? 0;
        plane.style.transform = `translate(${cx - planeW / 2 - hostLeft}px, ${Math.min(sy, ride)}px)`;
      }
      const d = door.getBoundingClientRect(), l = land.getBoundingClientRect();
      // Landed when the landing pad reaches 70% of the viewport. The jump happens at `ride`.
      const landAt = l.top + sy - vh * 0.7;
      const start = landAt > 0 ? clamp(ride / landAt) : 0;
      const p = landAt > 0 ? (start < 1 ? clamp((sy / landAt - start) / (1 - start)) : 1) : 1;
      // Riding: follow the moving door. After the jump: leave from where the door was then.
      const jumpDoorX = vw * PLANE_JUMP + planeW * (0.628 - 0.5);
      const doorX = plane && sy > ride ? jumpDoorX : d.left + d.width / 2, doorY = d.top + d.height / 2;
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
      if (reduce.matches) { cancelAnimationFrame(raf); raf = 0; if (plane) plane.style.transform = ''; } else draw();
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
