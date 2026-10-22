"use client";
import type {Evidence} from '@/lib/contracts';
import styles from './matches.module.css';

// Public evidence is fetched server-side (Vernika's GitHub adapter) and arrives
// on the authorized match response. Until that route is wired, or if a fetch
// fails, we show an explicit empty/fallback state — never fabricated "live" data.
export default function EvidenceList({evidence}: {evidence: Evidence[]}) {
  if (evidence.length === 0) {
    return (
      <div className={styles.block}>
        <h4>PUBLIC EVIDENCE</h4>
        <p className="muted">
          No live public evidence connected yet. When enabled, this shows real GitHub projects with
          source links — existing tooling or adjacent work, not proof anyone will pay.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.block}>
      <h4>PUBLIC EVIDENCE</h4>
      <ul className={styles.evidence}>
        {evidence.map(item => (
          <li key={item.id}>
            <a href={item.url} target="_blank" rel="noreferrer noopener">
              {item.title}
            </a>
            {item.cached && <span className="muted"> · cached</span>}
            {item.excerpt && <div className="muted">{item.excerpt}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
