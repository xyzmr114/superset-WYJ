"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useDemo} from '@/app/providers';
import type {MatchingCard} from '@/lib/contracts';
import {api, ApiFailure} from '@/lib/client/api';
import PrivateIntake from '@/components/onboarding/PrivateIntake';
import CardEditor from '@/components/onboarding/CardEditor';

export default function Onboarding() {
  const router = useRouter();
  const {setCard} = useDemo();
  const [displayName, setDisplayName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<{message: string; join?: boolean} | null>(null);

  // Only the approved card and the identity are sent. Private intake never leaves PrivateIntake.
  const publish = async ({alias, offers, seeks, interests, availability, approvedBlurb}: MatchingCard) => {
    setError(null);
    if (!displayName.trim() || !contact.trim()) {
      setError({message: 'Add your name and contact above. They stay hidden until you both approve.'});
      return;
    }
    try {
      const card = await api.publishCard({alias, offers, seeks, interests, availability, approvedBlurb});
      await api.putIdentity(displayName.trim(), contact.trim());
      setCard(card);
      router.push('/matches');
    } catch (err) {
      if (err instanceof ApiFailure && err.code === 'CARD_FROZEN') return router.push('/matches');
      setError({
        message: err instanceof Error ? err.message : 'Could not publish your card.',
        join: err instanceof ApiFailure && err.status === 401,
      });
    }
  };

  return (
    <section>
      <p className="eyebrow">STEP 01 / YOUR TERMS</p>
      <h1>
        A little context.<br />
        <em>Your choice to share.</em>
      </h1>
      <p className="lead">
        Two separate things: what you keep to yourself, and the card you explicitly approve for
        matching. One never becomes the other automatically.
      </p>
      <article>
        <span className="badge">REVEALED ONLY AFTER YOU BOTH SAY YES</span>
        <div className="grid" style={{margin: '12px 0 0'}}>
          <label>
            Your name
            <input required maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </label>
          <label>
            How to reach you
            <input required maxLength={200} value={contact} onChange={e => setContact(e.target.value)} placeholder="Email, LinkedIn or phone" />
          </label>
        </div>
        <p className="muted">Stored separately from your card. Nobody sees it until an introduction is approved by both of you.</p>
      </article>
      <div className="grid">
        <PrivateIntake />
        <CardEditor eventId="demo" onPublish={publish} />
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
