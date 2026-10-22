import type {Metadata} from 'next';
import Link from 'next/link';
import Providers from './providers';
import './globals.css';
export const metadata:Metadata={title:'Would You Jump?',description:'Find the people you could build your next chapter with.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers><header><Link className="brand" href="/">WYJ<span> / Would You Jump?</span></Link><nav style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap",fontSize:13}}><Link href="/agent">New idea</Link><Link href="/matches">Founders</Link><Link href="/ideas">My ideas</Link><Link href="/plans">Plans</Link></nav></header><main>{children}</main><footer>Your next chapter starts with a person.</footer></Providers></body></html>;}
