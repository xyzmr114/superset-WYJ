"use client";
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {usePrivateProfile} from '@/lib/client/private-profile';
import {api} from '@/lib/client/api';

export default function Join() {
  const router = useRouter();
  const {clear} = usePrivateProfile();
  const [eventCode, setEventCode] = useState('SUPERSET');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // QR codes point at /join?code=EVENT; prefill from it after mount.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) setEventCode(code);
  }, []);

  // Creates an anonymous server session (HttpOnly cookie), wipes any lingering
  // private notes, then moves to intake.
  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createSession(eventCode);
      clear();
      router.push('/agent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join.');
      setBusy(false);
    }
  };

  return (
    <section className="narrow">
      <p className="eyebrow">THE ROOM</p>
      <h1>
        Meet your<br />next possibility.
      </h1>
      <p className="lead">
        Scan the event code to join anonymously. Names stay hidden until two people both approve an
        introduction.
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
          <button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join this event →'}</button>
          {error && <p className="muted" role="alert">{error}</p>}
        </form>
      </article>
    </section>
  );
}
