"use client";
import {useMemo, useState} from 'react';
import {SKILLS, INTERESTS, type MatchingCard} from '@/lib/contracts';
import TagSelect from './TagSelect';
import styles from './onboarding.module.css';

const AVAILABILITY: MatchingCard['availability'][] = ['exploring', 'weekends', 'full_time'];
const AVAILABILITY_LABEL: Record<MatchingCard['availability'], string> = {
  exploring: 'Just exploring',
  weekends: 'Evenings & weekends',
  full_time: 'Ready to go full-time',
};

// When a model is wired for opportunity generation, name it here via env so the
// publication-consent copy is honest about who sees the approved card.
const MODEL_PROVIDER = process.env.NEXT_PUBLIC_MODEL_PROVIDER?.trim();

// The matching card is composed EXPLICITLY here. Private intake is never read,
// summarized, or copied into this card — the user types every published field.
export default function CardEditor({
  eventId,
  onPublish,
}: {
  eventId: string;
  onPublish: (card: MatchingCard) => void;
}) {
  const [alias, setAlias] = useState('Builder');
  const [offers, setOffers] = useState<string[]>(['engineering']);
  const [seeks, setSeeks] = useState<string[]>(['sales']);
  const [interests, setInterests] = useState<string[]>(['developer-tools']);
  const [availability, setAvailability] = useState<MatchingCard['availability']>('weekends');
  const [approvedBlurb, setApprovedBlurb] = useState('');
  const [consented, setConsented] = useState(false);

  const complete = Boolean(
    alias.trim() && offers.length && seeks.length && interests.length && approvedBlurb.trim(),
  );

  // Exactly what gets published — rendered for review before consent.
  const card = useMemo<MatchingCard>(
    () => ({
      id: 'demo-me',
      eventId,
      alias: alias.trim(),
      offers,
      seeks,
      interests,
      availability,
      approvedBlurb: approvedBlurb.trim(),
      version: 1,
    }),
    [eventId, alias, offers, seeks, interests, availability, approvedBlurb],
  );

  return (
    <article className={styles.publicPanel}>
      <span className="badge">APPROVED MATCHING CARD</span>
      <h2>What others could see</h2>
      <p className="muted">
        You compose this card yourself. Nothing from your private notes is copied here.
      </p>

      <label>
        Alias
        <input required maxLength={40} value={alias} onChange={e => setAlias(e.target.value)} />
      </label>

      <TagSelect legend="Skills I offer" options={SKILLS} selected={offers} onChange={setOffers} />
      <TagSelect legend="Skills I'm looking for" options={SKILLS} selected={seeks} onChange={setSeeks} />
      <TagSelect legend="Problem areas I care about" options={INTERESTS} selected={interests} onChange={setInterests} />

      <label>
        Availability
        <select
          value={availability}
          onChange={e => setAvailability(e.target.value as MatchingCard['availability'])}
        >
          {AVAILABILITY.map(value => (
            <option key={value} value={value}>
              {AVAILABILITY_LABEL[value]}
            </option>
          ))}
        </select>
      </label>

      <label>
        A short blurb to publish
        <textarea
          value={approvedBlurb}
          maxLength={240}
          onChange={e => setApprovedBlurb(e.target.value)}
          placeholder="Write this in your own words — it is published exactly as typed."
        />
      </label>

      <hr />

      <h3>Exactly what will be shared</h3>
      <div className={styles.previewLine}>
        <span className={styles.previewKey}>Alias</span>
        <span className={styles.previewVal}>{card.alias || <em className={styles.empty}>— required —</em>}</span>
      </div>
      <div className={styles.previewLine}>
        <span className={styles.previewKey}>Offers</span>
        <span className={styles.previewVal}>{offers.join(', ') || <em className={styles.empty}>— pick at least one —</em>}</span>
      </div>
      <div className={styles.previewLine}>
        <span className={styles.previewKey}>Seeks</span>
        <span className={styles.previewVal}>{seeks.join(', ') || <em className={styles.empty}>— pick at least one —</em>}</span>
      </div>
      <div className={styles.previewLine}>
        <span className={styles.previewKey}>Interests</span>
        <span className={styles.previewVal}>{interests.join(', ') || <em className={styles.empty}>— pick at least one —</em>}</span>
      </div>
      <div className={styles.previewLine}>
        <span className={styles.previewKey}>Availability</span>
        <span className={styles.previewVal}>{AVAILABILITY_LABEL[availability]}</span>
      </div>
      <div className={styles.previewLine}>
        <span className={styles.previewKey}>Blurb</span>
        <span className={styles.previewVal}>{card.approvedBlurb || <em className={styles.empty}>— required —</em>}</span>
      </div>

      <div className={styles.shareNote}>
        <strong>Where this card goes</strong>
        Shared with this event&apos;s matching service to find complementary people.
        {MODEL_PROVIDER
          ? ` These approved fields (never your private notes) may also be sent to the configured model provider: ${MODEL_PROVIDER}.`
          : ' Opportunities are generated from deterministic templates — no external model receives your card in this build.'}
        {' '}Your name and contact are stored separately and revealed only after you both approve an introduction.
      </div>

      <label className="check">
        <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} />
        I approve publishing exactly this card for matching at this event.
      </label>

      <button disabled={!complete || !consented} onClick={() => onPublish(card)}>
        Find my counterparts →
      </button>
    </article>
  );
}
