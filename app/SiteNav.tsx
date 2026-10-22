"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';

// The landing page keeps the header minimal (wordmark + Join); Agent and Matches live in its footer.
export default function SiteNav() {
  const home = usePathname() === '/';
  return (
    <nav className="site-nav">
      {!home && <Link href="/agent">Agent</Link>}
      {!home && <Link href="/matches">Matches</Link>}
      <Link className="nav-cta" href="/join">Join the event</Link>
    </nav>
  );
}
