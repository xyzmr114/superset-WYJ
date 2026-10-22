import PitchWorkspace from '@/components/pitch/PitchWorkspace';
export default async function Pitch({searchParams}:{searchParams:Promise<{pitchId?:string;matchId?:string}>}) {
 const params=await searchParams;
 return <PitchWorkspace pitchId={params.pitchId} matchId={params.matchId}/>;
}
