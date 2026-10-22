import WorkingDraft from '@/components/pitch/WorkingDraft';
import PitchWorkspace from '@/components/pitch/PitchWorkspace';
export default async function Pitch({searchParams}:{searchParams:Promise<{pitchId?:string;matchId?:string;from?:string}>}) {
 const params=await searchParams;
 if(params.from==='agent'&&!params.pitchId&&!params.matchId)return <WorkingDraft/>;
 return <PitchWorkspace pitchId={params.pitchId} matchId={params.matchId}/>;
}
