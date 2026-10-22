"use client";
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {createContext,useContext,useState,type ReactNode} from 'react';
import type {MatchingCard} from '@/lib/contracts';
type DemoState={card:MatchingCard|null;setCard:(card:MatchingCard)=>void};
const DemoContext=createContext<DemoState|null>(null);
export function useDemo(){const value=useContext(DemoContext);if(!value)throw new Error('Missing provider');return value;}
export default function Providers({children}:{children:ReactNode}){const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false}}}));const [card,setCard]=useState<MatchingCard|null>(null);return <QueryClientProvider client={client}><DemoContext.Provider value={{card,setCard}}>{children}</DemoContext.Provider></QueryClientProvider>;}
