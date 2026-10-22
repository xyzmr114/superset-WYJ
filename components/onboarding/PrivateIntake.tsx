"use client";
import {usePrivateProfile} from '@/lib/client/private-profile';
import styles from './onboarding.module.css';

// The private panel. Everything here is held in a dedicated in-memory context
// (see lib/client/private-profile.ts) and is NEVER published, sent, or persisted.
export default function PrivateIntake() {
  const {profile, update} = usePrivateProfile();

  return (
    <article className={styles.privatePanel}>
      <span className="badge">PRIVATE · THIS TAB ONLY</span>
      <h2>What would make you jump?</h2>

      <label>
        Your ambition
        <textarea
          value={profile.ambition}
          onChange={e => update({ambition: e.target.value})}
          placeholder="The company I've always wanted to build…"
        />
      </label>

      <label>
        What would need to be true first?
        <textarea
          value={profile.conditions}
          onChange={e => update({conditions: e.target.value})}
          placeholder="Conditions that would make leaving feel possible…"
        />
      </label>

      <label>
        Months of personal runway <span className="muted">(optional)</span>
        <input
          inputMode="decimal"
          value={profile.runway}
          onChange={e => update({runway: e.target.value})}
          placeholder="e.g. 9"
        />
      </label>

      <label>
        Your non-negotiables <span className="muted">(optional)</span>
        <textarea
          value={profile.mustHaves}
          onChange={e => update({mustHaves: e.target.value})}
          placeholder="Things that aren't up for discussion…"
        />
      </label>

      <p className="muted">
        None of this is sent to the server, the matching engine, or any model. It is used only for
        your own local “Would I jump?” checklist. <strong>Refreshing this tab erases it.</strong>
      </p>
    </article>
  );
}
