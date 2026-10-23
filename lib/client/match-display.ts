import type {MatchView} from '@/lib/contracts';
const priority:Record<MatchView['status'],number>={pending:4,revealed:3,suggested:2,declined:1};
/** One visible card per founder; keep an actual pair intact, never combine consent across ideas. */
export function uniqueFounderMatches(matches:MatchView[]):MatchView[]{
 const best=new Map<string,MatchView>();
 for(const match of matches){
  const previous=best.get(match.candidate.id);
  if(!previous||priority[match.status]>priority[previous.status]||priority[match.status]===priority[previous.status]&&match.score>previous.score)
   best.set(match.candidate.id,match);
 }
 return [...best.values()];
}
