"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';

// The landing page keeps the header minimal (wordmark + Join); the app pages get the full nav.
export default function SiteNav() {
  const home = usePathname() === '/';
  return (
    <nav className="site-nav">
      {!home && <Link href="/agent">New idea</Link>}
      {!home && <Link href="/matches">Founders</Link>}
      {!home && <Link href="/ideas">My ideas</Link>}
      {!home && <Link href="/plans">Plans</Link>}
      <Link className="nav-cta" href="/join">Start here</Link>
    </nav>
  );
}
