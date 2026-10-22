import type {Metadata} from 'next';
import {Albert_Sans,DM_Serif_Display} from 'next/font/google';
import Link from 'next/link';
import Providers from './providers';
import SkyScene from './SkyScene';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';
import './globals.css';
// Self-hosted by next/font: no browser requests to Google Fonts. globals.css reads the variables.
const serif=DM_Serif_Display({subsets:['latin'],weight:'400',style:['normal','italic'],variable:'--font-serif'});
const sans=Albert_Sans({subsets:['latin'],weight:['400','500','600','700'],variable:'--font-sans'});
export const metadata:Metadata={title:'Would You Jump?',description:'Find the people you could build your next chapter with.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${serif.variable} ${sans.variable}`}><body><Providers><SkyScene/><header><Link className="brand" href="/">WYJ<span> / Would You Jump?</span></Link><SiteNav/></header><main>{children}</main><SiteFooter/></Providers></body></html>;}
