import styles from './private.module.css';

// Who sees what. Mirrors the data-boundary table in PIVOT.md.
const TIERS = [
  {where: 'This device', who: 'Only you', what: 'Your profile text, goals, conditions and suggested labels', tone: styles.tierDevice},
  {where: 'The room', who: 'Matching and a proposed counterpart', what: 'The exact brief you approve, under an alias', tone: ''},
  {where: 'Sealed', who: 'Your match, after you both say yes', what: 'The name and contact you choose to reveal', tone: styles.tierSealed},
];

export default function DataBoundary() {
  return (
    <ol className={styles.boundary} aria-label="Where your information goes">
      {TIERS.map((tier, i) => (
        <li key={tier.where} className={`${styles.tier} ${tier.tone}`}>
          <span className={styles.tierStep}>{i + 1}</span>
          <div>
            <strong>{tier.where}</strong>
            <span className={styles.tierWhat}>{tier.what}</span>
            <span className={styles.tierWho}>Seen by: {tier.who}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
