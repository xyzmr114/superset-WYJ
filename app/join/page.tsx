"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {usePrivateProfile} from '@/lib/client/private-profile';

export default function Join() {
  const router = useRouter();
  const {clear} = usePrivateProfile();
  const [eventCode, setEventCode] = useState('SUPERSET-DEMO');

  // A real deployment creates an anonymous server session here (POST /api/session).
  // This build starts a local demo session: wipe any lingering private notes, then
  // move to intake.
  const start = (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    router.push('/onboarding');
  };

  return (
    <section className="narrow">
      <p className="eyebrow">THE ROOM / DEMO</p>
      <h1>
        Meet your<br />next possibility.
      </h1>
      <p className="lead">
        Scan the event code to join anonymously. This build uses fictional attendees and does not
        reveal any real identities yet.
      </p>
      <article>
        <h3>Start an anonymous session</h3>
        <p>
          No account, no resume. Your private intake lives only in this browser tab and is erased
          when you refresh or leave.
        </p>
        <form onSubmit={start}>
          <label>
            Event code
            <input value={eventCode} onChange={e => setEventCode(e.target.value)} required />
          </label>
          <button type="submit">Join this event →</button>
        </form>
      </article>
    </section>
  );
}
