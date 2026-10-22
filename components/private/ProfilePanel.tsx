"use client";
import {useState} from 'react';
import {usePrivateProfile} from '@/lib/client/private-profile';
import {classifyLocally, LOCAL_CLASSIFIER_URL, type LocalClassification} from '@/lib/private/classifier-contract';
import styles from './private.module.css';

// Your own profile text, held in tab memory. "Suggest labels" sends it only to the
// classifier on this laptop's loopback address (see lib/private/classifier-contract.ts).
export default function ProfilePanel({onApply}: {onApply: (result: LocalClassification) => void}) {
  const {profile, update} = usePrivateProfile();
  const [result, setResult] = useState<LocalClassification | null>(null);
  const [busy, setBusy] = useState(false);
  const host = new URL(LOCAL_CLASSIFIER_URL).host;

  const suggest = async () => {
    setBusy(true);
    setResult(await classifyLocally(profile.profileText));
    setBusy(false);
  };

  const labels = result && result.status !== 'unavailable'
    ? [
        ...result.suggested.offers.map(l => ({group: 'Offers', l})),
        ...result.suggested.seeks.map(l => ({group: 'Seeks', l})),
        ...result.suggested.interests.map(l => ({group: 'Interest', l})),
      ]
    : [];

  return (
    <article className={styles.privatePanel}>
      <span className="badge">PRIVATE · THIS TAB ONLY</span>
      <h2>Your profile</h2>
      <label>
        Paste your own profile or a few lines about you
        <textarea
          value={profile.profileText}
          onChange={e => update({profileText: e.target.value})}
          placeholder="Backend engineer, 6 years in payments infrastructure. Exploring an agent-native booking layer for travel…"
        />
      </label>

      <div className={styles.classifyRow}>
        <button type="button" onClick={suggest} disabled={busy || !profile.profileText.trim()}>
          {busy ? 'Reading on this device…' : 'Suggest labels'}
        </button>
        <span className={styles.engine}>
          <span className={result?.status === 'needs_review' ? styles.dotOn : styles.dotOff} aria-hidden="true" />
          Laya on this laptop ({host})
        </span>
      </div>

      {result && (
        <div className={result.status === 'unavailable' ? styles.resultOff : styles.result} role="status">
          <p>{result.message}</p>
          {labels.length > 0 && (
            <>
              <ul className={styles.labels}>
                {labels.map(({group, l}) => (
                  <li key={group + l}><span>{group}</span>{l}</li>
                ))}
              </ul>
              <button type="button" className={styles.apply} onClick={() => onApply(result)}>
                Use these in my brief
              </button>
            </>
          )}
          {result.status !== 'unavailable' && labels.length === 0 && <p>No labels from the shared list matched. Fill in your brief by hand.</p>}
        </div>
      )}

      <p className="muted">
        Never sent to the event server or a cloud model. Suggestions are a starting point. Nothing
        is published until you approve the brief.
      </p>
    </article>
  );
}
