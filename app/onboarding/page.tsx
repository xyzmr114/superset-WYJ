"use client";
import {useRouter} from 'next/navigation';
import {useDemo} from '@/app/providers';
import type {MatchingCard} from '@/lib/contracts';
import PrivateIntake from '@/components/onboarding/PrivateIntake';
import CardEditor from '@/components/onboarding/CardEditor';

export default function Onboarding() {
  const router = useRouter();
  const {setCard} = useDemo();

  const publish = (card: MatchingCard) => {
    setCard(card);
    router.push('/matches');
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
      <div className="grid">
        <PrivateIntake />
        <CardEditor eventId="demo" onPublish={publish} />
      </div>
    </section>
  );
}
