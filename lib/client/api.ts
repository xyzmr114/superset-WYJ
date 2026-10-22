import type { MatchView } from '@/lib/contracts';
export async function fetchMatches():Promise<MatchView[]> {
 const response=await fetch('/api/matches');
 if(!response.ok) throw new Error('Live matching is not connected yet.');
 return (await response.json()).matches;
}
export const matchQueryKey=['matches'] as const;
// Add authenticated useQuery/useMutation hooks here. Private intake must never enter query keys/cache.
