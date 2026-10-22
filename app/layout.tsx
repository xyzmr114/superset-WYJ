import type {Metadata} from 'next';
import Link from 'next/link';
import Providers from './providers';
import SkyScene from './SkyScene';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';
import './globals.css';
export const metadata:Metadata={title:'Would You Jump?',description:'Find the people you could build your next chapter with.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers><SkyScene/><header><Link className="brand" href="/">WYJ<span> / Would You Jump?</span></Link><SiteNav/></header><main>{children}</main><SiteFooter/></Providers></body></html>;}
