"use client";
import {useMemo, useState} from 'react';
import type {MatchingCard} from '@/lib/contracts';
import MultiSelect from './MultiSelect';
import {AVAILABILITY, AVAILABILITY_LABEL, INTEREST_SUGGESTIONS, LIMITS, SKILL_SUGGESTIONS} from './vocabulary';
import styles from './onboarding.module.css';

// When a model is wired for opportunity generation, name it here via env so the
// publication-consent copy is honest about who sees the approved card.
const MODEL_PROVIDER = process.env.NEXT_PUBLIC_MODEL_PROVIDER?.trim();

// Allowlisted labels suggested on this device. Applied only when the user asks.
export type BriefSuggestion = Pick<MatchingCard, 'offers' | 'seeks' | 'interests'> &
  Partial<Pick<MatchingCard, 'availability'>>;

// The matching card is composed EXPLICITLY here. Private intake is never read,
// summarized, or copied into this card — the user types or accepts every published field.
export default function CardEditor({
  eventId,
  onPublish,
  suggestion,
}: {
  eventId: string;
  onPublish: (card: MatchingCard) => void;
  suggestion?: BriefSuggestion | null;
}) {
  const [alias, setAlias] = useState('Builder');
  const [offers, setOffers] = useState<string[]>([]);
  const [seeks, setSeeks] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [availability, setAvailability] = useState<MatchingCard['availability']>('weekends');
  const [approvedBlurb, setApprovedBlurb] = useState('');
  // Approval is tied to the exact preview it was given for; any edit invalidates it.
  const [approvedPreview, setApprovedPreview] = useState<string | null>(null);

  // Fill the editable fields when a new suggestion is applied (React's
  // "adjust state when a prop changes" pattern). Empty suggestion lists keep what's there.
  const [appliedSuggestion, setAppliedSuggestion] = useState(suggestion);
  if (suggestion && suggestion !== appliedSuggestion) {
    setAppliedSuggestion(suggestion);
    if (suggestion.offers.length) setOffers(suggestion.offers.slice(0, LIMITS.offers));
    if (suggestion.seeks.length) setSeeks(suggestion.seeks.slice(0, LIMITS.seeks));
    if (suggestion.interests.length) setInterests(suggestion.interests.slice(0, LIMITS.interests));
    if (suggestion.availability) setAvailability(suggestion.availability);
  }

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
  const previewKey = JSON.stringify([card.alias, offers, seeks, interests, availability, card.approvedBlurb]);
  const consented = approvedPreview === previewKey;
  const approvalReset = approvedPreview !== null && !consented;

  return (
    <article className={styles.publicPanel}>
      <span className="badge">APPROVED MATCHING CARD</span>
      <h2>What others could see</h2>
      <p className="muted">
        You compose this card yourself. Nothing from your private notes is copied here.
      </p>

      <label>
        Alias
        <input required maxLength={LIMITS.alias} value={alias} onChange={e => setAlias(e.target.value)} />
      </label>

      <MultiSelect legend="Skills I offer" suggestions={SKILL_SUGGESTIONS} selected={offers} onChange={setOffers} placeholder="Type or pick a skill…" max={LIMITS.offers} />
      <MultiSelect legend="Skills I'm looking for" suggestions={SKILL_SUGGESTIONS} selected={seeks} onChange={setSeeks} placeholder="Type or pick a skill…" max={LIMITS.seeks} />
      <MultiSelect legend="Problem areas I care about" suggestions={INTEREST_SUGGESTIONS} selected={interests} onChange={setInterests} placeholder="Type or pick a problem area…" max={LIMITS.interests} />

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
          maxLength={LIMITS.blurb}
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
        <input type="checkbox" checked={consented} onChange={e => setApprovedPreview(e.target.checked ? previewKey : null)} />
        I approve publishing exactly this card for matching at this event.
      </label>
      {approvalReset && (
        <p className="muted" role="status">You changed the brief, so your earlier approval was cleared. Review it and approve this version.</p>
      )}

      <button disabled={!complete || !consented} onClick={() => onPublish(card)}>
        Find my counterparts →
      </button>
    </article>
  );
}
