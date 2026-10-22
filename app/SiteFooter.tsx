'use client';

import Link from 'next/link';
import {useEffect,useRef} from 'react';
import styles from './footer.module.css';

const links=[{title:'Build',items:[['Create a profile','/agent'],['Find founders','/matches'],['My ideas','/ideas']]},{title:'Explore',items:[['Free & Premium','/plans'],['Idea studio','/premium'],['How it works','/#how']]}];

/** Pointer mass displaces each letter; damped springs bring the glass back to rest. */
export default function SiteFooter(){
 const stage=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const node=stage.current;if(!node)return;
  const letters=Array.from(node.querySelectorAll<HTMLElement>('[data-letter]'));
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer={x:0,y:0,active:false};
  const bodies=letters.map(()=>({x:0,y:0,vx:0,vy:0}));
  let frame=0,visible=false,last=0;
  function draw(time:number){frame=0;if(!visible||motion.matches)return;const dt=Math.min((time-last)/16.67||1,2);last=time;let unsettled=false;const rect=node!.getBoundingClientRect();
   letters.forEach((letter,i)=>{const body=bodies[i],center=(i+.5)*rect.width/letters.length;const dx=pointer.x-center,dy=pointer.y-rect.height*.5;const influence=pointer.active?Math.max(0,1-Math.hypot(dx,dy)/Math.max(rect.width*.4,180)):0;
    const tx=-dx*.13*influence,ty=30*influence;body.vx+=(tx-body.x)*.065*dt;body.vy+=(ty-body.y)*.065*dt;body.vx*=Math.pow(.8,dt);body.vy*=Math.pow(.8,dt);body.x+=body.vx*dt;body.y+=body.vy*dt;unsettled ||= Math.abs(body.vx)+Math.abs(body.vy)+Math.abs(tx-body.x)+Math.abs(ty-body.y)>.02;
    letter.style.transform=`translate3d(${body.x}px,${body.y}px,0) rotateX(${-body.y*.45}deg) rotateY(${body.x*.7}deg) rotateZ(${body.x*.12}deg)`;
   });
   if(unsettled)frame=requestAnimationFrame(draw);
  }
  function start(){if(!frame&&visible&&!motion.matches){last=performance.now();frame=requestAnimationFrame(draw);}}
  function move(event:PointerEvent){if(event.pointerType==='touch')return;const rect=node!.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;pointer.active=true;node!.style.setProperty('--light-x',`${pointer.x/rect.width*100}%`);node!.style.setProperty('--light-y',`${pointer.y/rect.height*100}%`);start();}
  function leave(){pointer.active=false;start();}
  function preference(){if(motion.matches){cancelAnimationFrame(frame);frame=0;letters.forEach(letter=>letter.style.transform='none');}else start();}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else{cancelAnimationFrame(frame);frame=0;}},{threshold:.05});observer.observe(node);
  node.addEventListener('pointermove',move);node.addEventListener('pointerleave',leave);motion.addEventListener('change',preference);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',leave);motion.removeEventListener('change',preference);};
 },[]);
 return <footer className={styles.footer} aria-label="WYJ footer">
  <div className={styles.top}><div className={styles.intro}><Link href="/" className={styles.brand}>WYJ<span>Would You Jump?</span></Link><p>A private idea.<br/>The right person.<br/>Your next chapter.</p><Link href="/agent" className={styles.cta}>Find your people <span aria-hidden>↗</span></Link></div>
   <nav className={styles.links} aria-label="Footer navigation">{links.map(column=><div key={column.title}><h2>{column.title}</h2>{column.items.map(([name,href])=><Link href={href} key={href}>{name}<span aria-hidden>↗</span></Link>)}</div>)}</nav>
  </div>
  <div ref={stage} className={styles.stage} aria-label="Jump? Interactive glass wordmark"><div className={styles.lights} aria-hidden><i/><i/><i/></div><div className={styles.grid} aria-hidden/><div className={styles.word} aria-hidden>{['j','u','m','p','?'].map((letter,i)=><span data-letter key={i}>{letter}</span>)}</div><span className={styles.caption}>A LITTLE GRAVITY. A BIG LEAP.</span></div>
  <div className={styles.bottom}><span>© {new Date().getFullYear()} WYJ · Built at super{'{set}'}</span><span>Your profile. Your permission.</span><button type="button" onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>Back to top ↑</button></div>
 </footer>;
}
