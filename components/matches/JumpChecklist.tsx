"use client";
import type {CheckItem, CheckStatus} from '@/lib/client/private-profile';
import styles from './matches.module.css';

const MARK: Record<CheckStatus, string> = {satisfied: '✓', unknown: '?', unmet: '!'};
const TAG: Record<CheckStatus, string> = {satisfied: 'MET', unknown: 'UNKNOWN', unmet: 'NOT YET'};

// Renders the purely local checklist. The data is computed on-device from the
// private profile and never leaves the browser.
export default function JumpChecklist({items}: {items: CheckItem[]}) {
  return (
    <div className={styles.block}>
      <h4>WOULD I JUMP? · PRIVATE TO YOU</h4>
      <ul className={styles.checklist}>
        {items.map(item => (
          <li key={item.id} className={`${styles.checkItem} ${styles[item.status]}`}>
            <span className={styles.mark} aria-hidden>{MARK[item.status]}</span>
            <span className={styles.checkBody}>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </span>
            <span className={styles.statusTag}>{TAG[item.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
