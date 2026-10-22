"use client";
import {useEffect, useState} from 'react';
import styles from './landing.module.css';

// Fixed altitude readout: the page is the jump. 30,000 ft at the top, landed at the form.
const TOP = 30000;

export default function Elevation() {
  const [feet, setFeet] = useState(TOP);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      // Touch down when the landing section reaches mid-screen; hide over the footer.
      const landing = document.getElementById('landing');
      const ground = landing ? landing.offsetTop - window.innerHeight * 0.5 : document.documentElement.scrollHeight - window.innerHeight;
      const progress = ground > 0 ? Math.min(1, Math.max(0, window.scrollY / ground)) : 0;
      setFeet(Math.round(((1 - progress) * TOP) / 100) * 100);
      const footer = document.querySelector('footer');
      setHidden(footer ? footer.getBoundingClientRect().top < window.innerHeight * 0.6 : false);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className={`${styles.elevation} ${hidden ? styles.elevationHidden : ''}`} aria-hidden="true">
      <span>Elevation</span>
      <b>{feet === 0 ? 'Landed' : `${feet.toLocaleString('en-US')} ft`}</b>
    </div>
  );
}
