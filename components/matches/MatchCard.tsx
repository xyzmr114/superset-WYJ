"use client";
import Link from 'next/link';
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
// A reveal can still be *simulated* for offline demos when `onSimulateApproval`
// is passed; that path is clearly badged SYNTHETIC via `synthetic`.
export default function MatchCard({
  match,
  checklist,
  synthetic,
  onRequestIntro,
  onDecline,
  onSimulateApproval,
  pitchHref,
}: {
  match: MatchView;
  checklist: CheckItem[];
  synthetic: boolean;
  onRequestIntro: () => void;
  onDecline: () => void;
  onSimulateApproval?: () => void;
  pitchHref?: string;
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

      {status === 'pending' && !match.myIntroApproval && (
        <>
          <div className={styles.waiting}>
            <strong>They&apos;d like an introduction.</strong>
            <br />
            Names and contact details are revealed to both of you only if you approve too.
          </div>
          <div className={styles.cardActions}>
            <button onClick={onRequestIntro}>Approve introduction</button>
            <button className={styles.declineBtn} onClick={onDecline}>Decline</button>
          </div>
        </>
      )}

      {status === 'pending' && match.myIntroApproval && (
        <>
          <div className={styles.waiting}>
            <strong>Waiting for the other person…</strong>
            <br />
            You approved an introduction. Names and contact details stay hidden until they approve
            too. Either of you can still decline before that happens.
          </div>
          <div className={styles.cardActions}>
            {onSimulateApproval && (
              <button type="button" className={styles.synthBtn} onClick={onSimulateApproval}>
                ▷ Simulate their approval (synthetic demo)
              </button>
            )}
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
          {pitchHref && !synthetic && <Link className="button" href={pitchHref}>Shape a joint pitch →</Link>}
        </div>
      )}

      {status === 'declined' && (
        <p className={styles.declined}>Introduction declined. This pairing won&apos;t be surfaced again.</p>
      )}
    </article>
  );
}
