import type { MatchingCard } from '@/lib/contracts';
import { renderMemo } from '@/lib/agent/schema';

export const ideaKey = (card: MatchingCard): string => card.ideaId ?? card.id;

export type StudioAnswers = {
  customer: string;
  problem: string;
  workaround: string;
  wedge: string;
  assumption: string;
  experiment: string;
  signal: string;
  dataAccess: string;
};
export const emptyAnswers: StudioAnswers = { customer: '', problem: '', workaround: '', wedge: '', assumption: '', experiment: '', signal: '', dataAccess: '' };
export const essentialAnswers: (keyof StudioAnswers)[] = ['customer', 'problem', 'wedge', 'assumption', 'experiment', 'signal'];
export function unanswered(answers: StudioAnswers): (keyof StudioAnswers)[] {
  return essentialAnswers.filter(key => !answers[key].trim());
}
export function makeIdeaMemo(idea: MatchingCard, answers: StudioAnswers): string {
  if (unanswered(answers).length) throw new Error('Complete the customer, problem, wedge, assumption, experiment and decision rule first.');
  const a = Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, value.trim()])) as StudioAnswers;
  const teammate = idea.seeks.length ? `A partner who contributes ${idea.seeks.join(', ')}. Agree who owns customer conversations and who owns the first usable result before the trial starts.` : 'Choose the missing capability before agreeing on a working trial.';
  return renderMemo({
    title: `${idea.alias} — a testable first product`,
    problem: `${a.problem}\n\nCurrent workaround: ${a.workaround || 'Not yet documented; ask about a recent occurrence before pitching.'}`,
    customer: `${a.customer}\n\nBuyer and budget owner: still to confirm unless this role also buys the product.`,
    solution: `${a.wedge}\n\nApproved idea this builds on: ${idea.approvedBlurb}\n\nScope rule: prove this one workflow before expanding into the broader idea.`,
    team: `The approved brief offers ${idea.offers.join(', ') || 'skills still to specify'} and seeks ${idea.seeks.join(', ') || 'a complementary partner'}.${idea.preferences?.techStack.length ? ` Proposed stack: ${idea.preferences.techStack.join(', ')}.` : ''} These are self-reported capabilities.`,
    whyNow: 'A small test can run within 48 hours using the proposed first workflow. Market timing and demand remain hypotheses; no market research was retrieved in this studio.',
    experiment: `Within 48 hours: ${a.experiment}\n\nRiskiest assumption: ${a.assumption}\n\nDecision rule chosen before running the test: ${a.signal}\n\nRecord what customers did, a source or artifact, and the date. Keep compliments separate from a concrete commitment.`,
    teammate,
    jumpTest: 'Use the decision rule to choose whether to run another experiment, narrow the customer, or stop this direction. One small positive test does not establish demand or justify a career commitment.',
    unknowns: [a.assumption, 'Who pays, and how do they buy a comparable product today?', 'Which existing alternative is good enough, and what would cause a switch?', a.dataAccess ? `Data/permission plan to verify: ${a.dataAccess}` : 'What data does the first workflow need, who controls it, and what permission is required?'],
  }, []) + '\n\n## Prepared in WYJ Idea Studio\nStructured in this browser from one approved pseudonymous idea and the answers entered here. No private profile, founder identity, cloud model, or external outreach was used. Assumptions and capabilities are self-reported, not independently verified.\n';
}
export function interviewPrompts(answers: StudioAnswers): string[] {
  return [
    `Ask ${answers.customer.trim() || 'the proposed customer'}: “Tell me about the last time ${answers.problem.trim() || 'this problem occurred'}. What did you do?”`,
    'Ask what they tried or paid for, then ask what failed about that approach before showing your proposed product.',
    `Test the assumption “${answers.assumption.trim() || 'the riskiest assumption you have not established yet'}” with an observable action, not a rating of the idea.`,
  ];
}
