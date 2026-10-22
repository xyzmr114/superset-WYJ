import type {Metadata} from 'next';
import Link from 'next/link';
import Providers from './providers';
import SkyScene from './SkyScene';
import './globals.css';
export const metadata:Metadata={title:'Would You Jump?',description:'Find the people you could build your next chapter with.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers><SkyScene/><header><Link className="brand" href="/">WYJ<span> / Would You Jump?</span></Link><nav className="site-nav"><Link href="/agent">Agent</Link><Link href="/matches">Matches</Link><Link className="nav-cta" href="/join">Join the event</Link></nav></header><main>{children}</main><footer>Your next chapter starts with a person.</footer></Providers></body></html>;}
