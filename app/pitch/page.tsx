import Link from 'next/link';
import WorkingDraft from '@/components/pitch/WorkingDraft';
import PitchWorkspace from '@/components/pitch/PitchWorkspace';
export default async function Pitch({searchParams}:{searchParams:Promise<{pitchId?:string;matchId?:string;from?:string}>}) {
 const params=await searchParams;
 if(!params.from&&!params.pitchId&&!params.matchId)return <section className="narrow"><p className="eyebrow">BUILD TOGETHER</p><h1>Start with an introduction.</h1><p className="lead">Choose a founder you have connected with to create a shared pitch. Both of you review the same version before exporting.</p><Link className="button" href="/matches">Open my founder matches →</Link></section>;
 if(params.from==='agent'&&!params.pitchId&&!params.matchId)return <WorkingDraft/>;
 return <PitchWorkspace pitchId={params.pitchId} matchId={params.matchId}/>;
}
