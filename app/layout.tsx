import type {Metadata} from 'next';
import Link from 'next/link';
import Providers from './providers';
import './globals.css';
export const metadata:Metadata={title:'Would You Jump?',description:'Find the people you could build your next chapter with.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers><header><Link className="brand" href="/">WYJ<span> / Would You Jump?</span></Link><span className="badge">HACKATHON PROTOTYPE</span></header><main>{children}</main><footer>Independent prototype · No affiliation with super&#123;set&#125; · Synthetic demo participants</footer></Providers></body></html>;}
