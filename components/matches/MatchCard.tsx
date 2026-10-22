"use client";
import type {MatchView} from '@/lib/contracts';
import type {CheckItem} from '@/lib/client/private-profile';
import JumpChecklist from './JumpChecklist';
import EvidenceList from './EvidenceList';
import styles from './matches.module.css';

// Renders one candidate: complementary skills, a source-linked opportunity,
// uncertainties, the local checklist, and the consent/reveal controls.
//
// Reveal rule: `match.revealedContact` is shown ONLY when it is present on the
// authorized match response. We never fetch identity early and hide it with CSS.
// In this frontend build there is no backend, so a reveal can be *simulated*;
// that path is clearly badged SYNTHETIC and passed down via `synthetic`.
export default function MatchCard({
  match,
  checklist,
  synthetic,
  onRequestIntro,
  onDecline,
  onSimulateApproval,
}: {
  match: MatchView;
  checklist: CheckItem[];
  synthetic: boolean;
  onRequestIntro: () => void;
  onDecline: () => void;
  onSimulateApproval: () => void;
}) {
  const {candidate, score, opportunity, evidence, status, revealedContact} = match;

  return (
    <article>
      <span className="badge">{score}/100 HEURISTIC FIT</span>
      <h2>{candidate.alias}</h2>
      <p>{candidate.approvedBlurb}</p>

      <div className={styles.skills}>
        <span><b>Offers</b>{candidate.offers.join(', ')}</span>
        <span><b>Seeks</b>{candidate.seeks.join(', ')}</span>
      </div>

      <hr />

      <h3>{opportunity.title}</h3>
      <p>{opportunity.problemHypothesis}</p>

      {opportunity.whyThisPair.length > 0 && (
        <div className={styles.block}>
          <h4>WHY THIS PAIR</h4>
          <ul className={styles.list}>
            {opportunity.whyThisPair.map((reason, i) => <li key={i}>{reason}</li>)}
          </ul>
        </div>
      )}

      {opportunity.unknowns.length > 0 && (
        <div className={styles.block}>
          <h4>STILL UNKNOWN</h4>
          <ul className={styles.list}>
            {opportunity.unknowns.map((unknown, i) => <li key={i}>{unknown}</li>)}
          </ul>
        </div>
      )}

      <div className={styles.block}>
        <h4>FIRST EXPERIMENT</h4>
        <p className="muted">{opportunity.nextExperiment}</p>
      </div>

      <EvidenceList evidence={evidence} />

      <JumpChecklist items={checklist} />

      <hr />

      {status === 'suggested' && (
        <div className={styles.cardActions}>
          <button onClick={onRequestIntro}>Request an introduction</button>
          <button className={styles.declineBtn} onClick={onDecline}>Not now</button>
        </div>
      )}

      {status === 'pending' && (
        <>
          <div className={styles.waiting}>
            <strong>Waiting for the other person…</strong>
            <br />
            You approved an introduction. Names and contact details stay hidden until they approve
            too. Either of you can still decline before that happens.
          </div>
          <div className={styles.cardActions}>
            <button type="button" className={styles.synthBtn} onClick={onSimulateApproval}>
              ▷ Simulate their approval (synthetic demo)
            </button>
            <button className={styles.declineBtn} onClick={onDecline}>Withdraw</button>
          </div>
        </>
      )}

      {status === 'revealed' && revealedContact && (
        <div className={styles.revealed}>
          <h4>INTRODUCTION {synthetic ? '· SYNTHETIC DEMO — NOT A REAL REVEAL' : 'APPROVED BY BOTH'}</h4>
          <p>
            <strong>{revealedContact.displayName}</strong>
            <br />
            {revealedContact.contact}
          </p>
          <p className="muted">
            Once seen, an introduction can&apos;t be un-seen — we don&apos;t promise to erase it from
            anyone&apos;s memory.
          </p>
        </div>
      )}

      {status === 'declined' && (
        <p className={styles.declined}>Introduction declined. This pairing won&apos;t be surfaced again.</p>
      )}
    </article>
  );
}
