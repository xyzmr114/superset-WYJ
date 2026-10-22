"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useDemo} from '@/app/providers';
import type {MatchingCard} from '@/lib/contracts';
import {api, ApiFailure} from '@/lib/client/api';
import PrivateIntake from '@/components/onboarding/PrivateIntake';
import CardEditor, {type BriefSuggestion} from '@/components/onboarding/CardEditor';
import DataBoundary from './DataBoundary';
import ProfilePanel from './ProfilePanel';
import type {LocalClassification} from '@/lib/private/classifier-contract';
import styles from './private.module.css';

// The private founder workspace: own profile and goals stay in tab memory,
// local label suggestions feed an editable brief, and only the approved brief is
// sent. Name and contact are chosen per pairing on the match card, not here.
export default function PrivateWorkspace() {
  const router = useRouter();
  const {setCard} = useDemo();
  const [suggestion, setSuggestion] = useState<BriefSuggestion | null>(null);
  const [error, setError] = useState<{message: string; join?: boolean} | null>(null);

  // Availability is applied only when the classifier found it stated.
  const apply = ({suggested}: LocalClassification) =>
    setSuggestion({offers: suggested.offers, seeks: suggested.seeks, interests: suggested.interests, availability: suggested.availability ?? undefined});

  // Only the approved card is sent. Private notes never leave this tab.
  const publish = async ({alias, offers, seeks, interests, availability, approvedBlurb}: MatchingCard) => {
    setError(null);
    try {
      const card = await api.publishCard({alias, offers, seeks, interests, availability, approvedBlurb});
      setCard(card);
      router.push('/matches');
    } catch (err) {
      if (err instanceof ApiFailure && err.code === 'CARD_FROZEN') return router.push('/matches');
      setError({
        message: err instanceof Error ? err.message : 'Could not publish your brief.',
        join: err instanceof ApiFailure && err.status === 401,
      });
    }
  };

  return (
    <section>
      <p className="eyebrow">YOUR PRIVATE AGENT</p>
      <h1>
        Find a co-founder.<br />
        <em>Keep your plans to yourself.</em>
      </h1>
      <p className="lead">
        Tell it about you and what you want to build. It stays on this device. You decide the
        exact brief the room sees, and names unlock only when you both say yes.
      </p>
      <DataBoundary />

      <h2 className={styles.stepTitle}><span>1</span> Private to you</h2>
      <div className="grid">
        <ProfilePanel onApply={apply} />
        <PrivateIntake />
      </div>

      <h2 className={styles.stepTitle}><span>2</span> The brief you approve</h2>
      <div className={styles.briefRow}>
        <CardEditor eventId="demo" onPublish={publish} suggestion={suggestion} />
        <aside className={styles.sidebar}>
          <article>
            <h3>What happens next</h3>
            <ol className={styles.next}>
              <li>WYJ proposes up to three complementary founders.</li>
              <li>Each of you privately picks Interested or Pass.</li>
              <li>If you're interested, you choose the name and contact to reveal for that pairing.</li>
              <li>They unlock only when you both approve.</li>
            </ol>
          </article>
        </aside>
      </div>

      {error && (
        <p className="muted" role="alert">
          {error.message}
          {error.join && <> <Link href="/join">Join the event first →</Link></>}
        </p>
      )}
    </section>
  );
}
