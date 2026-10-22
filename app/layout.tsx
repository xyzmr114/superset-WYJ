import type {Metadata} from 'next';
import {DM_Mono,Fraunces,Schibsted_Grotesk} from 'next/font/google';
import Link from 'next/link';
import Providers from './providers';
import SkyScene from './SkyScene';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';
import './globals.css';
// Self-hosted by next/font: no browser requests to Google Fonts. globals.css reads the variables.
const serif=Fraunces({subsets:['latin'],style:['normal','italic'],axes:['opsz','SOFT','WONK'],variable:'--font-serif'});
const sans=Schibsted_Grotesk({subsets:['latin'],variable:'--font-sans'});
const mono=DM_Mono({subsets:['latin'],weight:['400','500'],variable:'--font-mono'});
export const metadata:Metadata={title:'Would You Jump?',description:'Find the people you could build your next chapter with.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}><body><Providers><SkyScene/><header><Link className="brand" href="/">WYJ<span> / Would You Jump?</span></Link><SiteNav/></header><main>{children}</main><SiteFooter/></Providers></body></html>;}
