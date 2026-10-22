"use client";
import Link from 'next/link';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {usePrivateProfile, evaluateJump} from '@/lib/client/private-profile';
import {api, ApiFailure, fetchMatches, matchQueryKey} from '@/lib/client/api';
import MatchCard from '@/components/matches/MatchCard';

export default function Matches() {
  const {profile} = usePrivateProfile();
  const client = useQueryClient();
  // Generate once (idempotent on the server), then poll so the other person's approval shows up.
  const generated = useQuery({queryKey: ['matches-generate'], queryFn: api.generateMatches, retry: false, staleTime: Infinity});
  const matches = useQuery({queryKey: matchQueryKey, queryFn: fetchMatches, enabled: generated.isSuccess, refetchInterval: 3000});
  const decide = useMutation({
    mutationFn: ({id, decision}: {id: string; decision: 'approve' | 'decline'}) => api.consent(id, decision),
    onSuccess: () => client.invalidateQueries({queryKey: matchQueryKey}),
  });

  const err = generated.error;
  if (err instanceof ApiFailure && err.status === 401) {
    return (
      <section className="narrow">
        <p className="eyebrow">STEP 02 / POSSIBLE COUNTERPARTS</p>
        <h1>Join first.</h1>
        <p className="lead">Your session isn&apos;t active on this device.</p>
        <Link className="button" href="/join">Join the event →</Link>
      </section>
    );
  }
  if (err instanceof ApiFailure && err.code === 'NO_CARD') {
    return (
      <section className="narrow">
        <p className="eyebrow">STEP 02 / POSSIBLE COUNTERPARTS</p>
        <h1>Start with your card.</h1>
        <p className="lead">There is no approved card for this session yet.</p>
        <Link className="button" href="/onboarding">Create a card →</Link>
      </section>
    );
  }
  if (err) {
    return (
      <section className="narrow">
        <h1>Matching hit a snag.</h1>
        <p className="muted">{err.message}</p>
        <button onClick={() => generated.refetch()}>Try again</button>
      </section>
    );
  }

  const list = matches.data ?? generated.data?.matches ?? [];

  return (
    <section>
      <p className="eyebrow">STEP 02 / POSSIBLE COUNTERPARTS</p>
      <h1>
        A different skill set.<br />
        <em>A shared direction.</em>
      </h1>
      <p className="lead">
        Heuristic matching · identities stay hidden until both sides approve an introduction.
        Profiles marked &ldquo;Synthetic&rdquo; are fictional examples and never respond.
      </p>

      {generated.isPending ? (
        <p className="muted">Finding counterparts…</p>
      ) : list.length === 0 ? (
        <article>
          <h2>No suitable counterparts yet.</h2>
          <p>That is a valid result — we won&apos;t invent a match. Check back as more people join.</p>
          <div className="actions">
            <button onClick={() => generated.refetch()}>Check again</button>
          </div>
        </article>
      ) : (
        <div className="grid three">
          {list.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              synthetic={false}
              checklist={evaluateJump(profile, m.opportunity)}
              onRequestIntro={() => decide.mutate({id: m.id, decision: 'approve'})}
              onDecline={() => decide.mutate({id: m.id, decision: 'decline'})}
              pitchHref={`/pitch?matchId=${encodeURIComponent(m.id)}`}
            />
          ))}
        </div>
      )}
      {decide.error && <p className="muted" role="alert">{decide.error.message}</p>}

      <div className="actions">
        <Link className="secondary" href="/onboarding">Back to your card</Link>
      </div>
    </section>
  );
}
