"use client";
import {useState} from 'react';
import Link from 'next/link';
import {useDemo} from '@/app/providers';
import {usePrivateProfile, evaluateJump} from '@/lib/client/private-profile';
import {rankCandidates} from '@/lib/matching';
import {proposeOpportunity} from '@/lib/generation';
import {profiles} from '@/fixtures/profiles';
import type {MatchView} from '@/lib/contracts';
import MatchCard from '@/components/matches/MatchCard';

type Status = MatchView['status'];

export default function Matches() {
  const {card} = useDemo();
  const {profile} = usePrivateProfile();
  // Local-only consent state. Resets on refresh — matching the demo contract.
  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  if (!card) {
    return (
      <section className="narrow">
        <p className="eyebrow">STEP 02 / POSSIBLE COUNTERPARTS</p>
        <h1>Start with your card.</h1>
        <p className="lead">Demo state resets on refresh, so there is no approved card yet.</p>
        <Link className="button" href="/onboarding">Create a card →</Link>
      </section>
    );
  }

  const ranked = rankCandidates(card, profiles);

  const setStatus = (id: string, status: Status) => setStatuses(prev => ({...prev, [id]: status}));

  return (
    <section>
      <p className="eyebrow">STEP 02 / POSSIBLE COUNTERPARTS</p>
      <h1>
        A different skill set.<br />
        <em>A shared direction.</em>
      </h1>
      <p className="lead">
        Synthetic attendees · local heuristic matching · identities stay hidden until both sides
        approve an introduction.
      </p>

      {ranked.length === 0 ? (
        <article>
          <h2>No suitable counterparts yet.</h2>
          <p>
            That is a valid result — we won&apos;t invent a match. Try editing your card toward the
            seeded scenario (offer <em>engineering</em>, seek <em>sales</em>, interest{' '}
            <em>developer-tools</em>).
          </p>
          <div className="actions">
            <Link className="secondary" href="/onboarding">Edit demo card</Link>
          </div>
        </article>
      ) : (
        <div className="grid three">
          {ranked.map(({candidate, score}) => {
            const opportunity = proposeOpportunity(card, candidate);
            const status: Status = statuses[candidate.id] ?? 'suggested';
            const synthetic = status === 'revealed';

            // Identity is synthesised ONLY for the simulated-approval demo path and
            // clearly badged. A real reveal arrives on the authorized backend response.
            const match: MatchView = {
              id: candidate.id,
              candidate,
              score,
              opportunity,
              evidence: [],
              status,
              myIntroApproval: status === 'pending' || status === 'revealed',
              ...(synthetic
                ? {
                    revealedContact: {
                      displayName: `Synthetic founder · ${candidate.alias}`,
                      contact: `${candidate.alias.toLowerCase()}@synthetic.demo`,
                    },
                  }
                : {}),
            };

            return (
              <MatchCard
                key={candidate.id}
                match={match}
                synthetic={synthetic}
                checklist={evaluateJump(profile, opportunity)}
                onRequestIntro={() => setStatus(candidate.id, 'pending')}
                onDecline={() => setStatus(candidate.id, 'declined')}
                onSimulateApproval={() => setStatus(candidate.id, 'revealed')}
              />
            );
          })}
        </div>
      )}

      <div className="actions">
        <Link className="secondary" href="/onboarding">Edit demo card</Link>
        <Link className="secondary" href="/pitch">Preview pitch workspace →</Link>
      </div>
    </section>
  );
}
