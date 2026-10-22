/** Public-source synthesis, reviewed 2026-10-22. Not an official selection rubric. */
export type ReviewPrompt = {
  id: string;
  title: string;
  origin: 'published' | 'synthesis';
  question: string;
  evidence: string;
  nextStep: string;
  source?: { title: string; url: string };
};
const memo = {title:'super{set}: solution memos',url:'https://superset.com/blogs/vcs-write-investment-memos'};
const approach = {title:'super{set}: company-building approach',url:'https://superset.com/approach'};
export const reviewPrompts: ReviewPrompt[] = [
  {id:'pain',title:'Why here?',origin:'published',question:'Which specific customer experiences the problem?',evidence:'A concrete example, current workaround, and cost of the problem.',nextStep:'Find a customer who can describe a recent occurrence.',source:memo},
  {id:'team',title:'Why this team?',origin:'published',question:'What relevant insight and capability do you bring?',evidence:'Domain experience and a credible data-driven solution.',nextStep:'Identify a missing capability and the person who could supply it.',source:memo},
  {id:'timing',title:'Why now?',origin:'published',question:'What makes a paying market possible now?',evidence:'A change in demand or technology, plus existing alternatives.',nextStep:'Find evidence for the change and compare an alternative.',source:memo},
  {id:'insertion',title:'The insertion product',origin:'published',question:'What single need does the first product solve?',evidence:'A narrow initial workflow and a plausible expansion path.',nextStep:'Describe the first usable result and what comes after it.',source:approach},
  {id:'data',title:'Data at the center',origin:'published',question:'What role does data play in the product?',evidence:'Data inputs, access rights, and how they create value.',nextStep:'Sketch the data flow and the permissions it requires.',source:approach},
  {id:'message',title:'Test the message',origin:'published',question:'Can a customer understand the proposed solution?',evidence:'Their response to a clear explanation or small prototype.',nextStep:'Test clarity; do not treat enthusiasm as product-market fit.',source:memo},
  {id:'buyer',title:'Separate the user from the buyer',origin:'synthesis',question:'Who benefits, who approves, and whose budget pays?',evidence:'A named buyer role, buying process, and an observed commitment—not a guessed budget.',nextStep:'Ask a prospective customer how they last purchased a comparable solution.'},
  {id:'learning',title:'Design a test you could fail',origin:'synthesis',question:'Which assumption could kill this idea, and what would change your mind?',evidence:'A small experiment, observable outcome, deadline, and decision rule chosen in advance.',nextStep:'Run the smallest test that could disprove your riskiest assumption.'},
  {id:'behavior',title:'Look for behavior, not compliments',origin:'synthesis',question:'What has the customer already tried, used, or paid for?',evidence:'Specific past behavior and a concrete next step; keep interest separate from payment and repeat use.',nextStep:'Ask for a recent example before describing your proposed solution.'}
];
export type ReviewAnswer = { note: string; status: 'unknown' | 'hypothesis' | 'observed' };
export type ReviewAnswers = Record<string,ReviewAnswer>;
export function buildReviewAppendix(answers:ReviewAnswers):string {
  const answered=reviewPrompts.filter(p=>answers[p.id]?.note.trim());
  if(!answered.length)return '';
  return '\n\n## Founder evidence review\n\nIndependent preparation aid. Notes and evidence labels are self-reported, not verified or an investment assessment.\n'+answered.map(p=>{
    const a=answers[p.id];
    return `\n### ${p.title}\nBasis: ${p.origin==='published'?'Adapted from public super{set} material':'General startup practice; our synthesis'}.\nEvidence status: ${a.status}.\n${a.note.trim()}\n${p.source?`Reference: ${p.source.url}\n`:''}`;
  }).join('');
}
