'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { MatchingCard } from '@/lib/contracts';
import { approvedEnhancementInput } from '@/lib/premium/enhancement-contract';
import Markdown from '@/components/shared/Markdown';
import FounderReview from '@/components/pitch/FounderReview';
import IdeaResearch from './IdeaResearch';
import { emptyAnswers, ideaKey, interviewPrompts, makeIdeaMemo, unanswered, type StudioAnswers } from './studio';
import styles from './premium.module.css';

type Plan = { plan: 'free' | 'premium'; ideaCount: number; ideaLimit: number | null; billingConnected: false };
function isIdea(value: unknown): value is MatchingCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<MatchingCard>;
  return typeof card.id === 'string' && typeof card.alias === 'string' && typeof card.approvedBlurb === 'string' && Array.isArray(card.offers) && card.offers.every(item => typeof item === 'string') && Array.isArray(card.seeks) && card.seeks.every(item => typeof item === 'string');
}
function download(markdown: string) {
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'WYJ-idea-studio.md';
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function IdeaStudio() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [ideas, setIdeas] = useState<MatchingCard[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [answers, setAnswers] = useState<StudioAnswers>({ ...emptyAnswers });
  const [markdown, setMarkdown] = useState('');
  const [preview, setPreview] = useState(true);
  const [ready, setReady] = useState(false);
  const [join, setJoin] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [reload, setReload] = useState(0);
  const [enhancementConsent, setEnhancementConsent] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancementError, setEnhancementError] = useState('');
  const [enhancementSource, setEnhancementSource] = useState<{ model: string; briefVersion: number } | null>(null);
  const enhancementRequest = useRef<AbortController | null>(null);
  const enhancementSequence = useRef(0);
  const selectedRevision = useRef('');
  useEffect(() => {
    const controller = new AbortController();
    setReady(false); setError(''); setJoin(false);
    Promise.all([
      fetch('/api/me/plan', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal }),
      fetch('/api/me/ideas', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal }),
    ]).then(async ([planResponse, ideaResponse]) => {
      if (planResponse.status === 401 || ideaResponse.status === 401) { setJoin(true); return; }
      if (!planResponse.ok || !ideaResponse.ok) throw new Error('Your plan and approved ideas could not be loaded.');
      const [nextPlan, body] = await Promise.all([planResponse.json(), ideaResponse.json()]);
      if (!['free', 'premium'].includes(nextPlan.plan) || !Array.isArray(body.ideas)) throw new Error('The studio received an unexpected account response.');
      setPlan(nextPlan as Plan);
      const cards = body.ideas.filter((card: unknown) => isIdea(card) && (card as MatchingCard & {publicationStatus?: string}).publicationStatus !== 'unpublished');
      setIdeas(cards); setSelectedId(current => cards.some((card: MatchingCard) => ideaKey(card) === current) ? current : cards[0] ? ideaKey(cards[0]) : '');
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The studio could not load.'); })
      .finally(() => { if (!controller.signal.aborted) setReady(true); });
    return () => controller.abort();
  }, [reload]);
  const idea = ideas.find(card => ideaKey(card) === selectedId);
  const revision = idea ? `${ideaKey(idea)}:${idea.version}` : '';
  selectedRevision.current = revision;
  useEffect(() => {
    enhancementSequence.current += 1;
    enhancementRequest.current?.abort();
    setEnhancementConsent(false); setEnhancing(false); setEnhancementError(''); setEnhancementSource(null);
    setMarkdown(''); setDirty(false); setMessage('');
    return () => { enhancementSequence.current += 1; enhancementRequest.current?.abort(); };
  }, [revision]);
  const missing = unanswered(answers);
  function cancelEnhancement() {
    enhancementSequence.current += 1;
    enhancementRequest.current?.abort();
    setEnhancing(false);
    setEnhancementConsent(false);
    setEnhancementError('');
    setMessage('Stopped waiting for the draft. An already submitted request may still finish at DeepSeek.');
  }
  async function enhance() {
    if (!idea || !enhancementConsent || enhancing) return;
    const requestedRevision = revision;
    const sequence = ++enhancementSequence.current;
    const controller = new AbortController();
    enhancementRequest.current?.abort(); enhancementRequest.current = controller;
    setEnhancing(true); setEnhancementError(''); setMessage('');
    try {
      // The server resolves the owned approved brief. Never send questionnaire answers or profile text.
      const response = await fetch('/api/premium/enhance', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: ideaKey(idea), briefVersion: idea.version, consent: true }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || `DeepSeek could not create this draft (${response.status}).`);
      if (body?.provider !== 'DeepSeek' || typeof body.markdown !== 'string' || !body.markdown.trim() || typeof body.model !== 'string' || body.briefVersion !== idea.version) throw new Error('The enhancement response did not match this approved brief. Please try again.');
      if (controller.signal.aborted || sequence !== enhancementSequence.current || requestedRevision !== selectedRevision.current) return;
      setMarkdown(body.markdown); setDirty(false); setPreview(true);
      setEnhancementSource({ model: body.model, briefVersion: body.briefVersion });
      setEnhancementConsent(false);
      setMessage('DeepSeek draft ready below. Review its assumptions and edit before exporting. Your private questionnaire answers were not sent.');
    } catch (cause) {
      if (!controller.signal.aborted && sequence === enhancementSequence.current && requestedRevision === selectedRevision.current) setEnhancementError(cause instanceof Error ? cause.message : 'DeepSeek is unavailable. Try again or use the local memo below.');
    } finally {
      if (sequence === enhancementSequence.current && requestedRevision === selectedRevision.current) setEnhancing(false);
    }
  }
  function update(key: keyof StudioAnswers, value: string) {
    setAnswers(current => ({ ...current, [key]: value }));
    if (markdown) setDirty(true);
    setMessage('');
  }
  function build() {
    if (!idea || missing.length) return;
    setMarkdown(makeIdeaMemo(idea, answers)); setEnhancementSource(null); setDirty(false); setPreview(true); setMessage('Your working memo is ready. Review it before copying or downloading.');
  }
  async function copy() {
    try { await navigator.clipboard.writeText(markdown); setMessage('Memo copied.'); }
    catch { setError('Clipboard access is unavailable. Download the Markdown file instead.'); }
  }
  const field = (key: keyof StudioAnswers, label: string, hint: string, rows = 3) => <label key={key} htmlFor={`studio-${key}`}>{label}<span className={styles.hint}>{hint}</span><textarea id={`studio-${key}`} rows={rows} maxLength={1200} value={answers[key]} onChange={event => update(key, event.target.value)}/></label>;
  return <section className={styles.studio}>
    <div className={styles.topline}><p className="eyebrow">WYJ PREMIUM / IDEA STUDIO</p><Link className="secondary" href="/agent">← Your private workspace</Link></div>
    <h1>Make your idea<br/><em>worth testing.</em></h1>
    <p className="lead">Find the first customer, sharpen one useful workflow, and leave with a 48-hour experiment.</p>
    <p className={styles.boundary}>Work from a published idea. Questionnaire answers and drafts stay in this page’s memory. Optional DeepSeek enhancement has its own exact send preview and approval. Refreshing clears unsaved work.</p>
    {!ready && <p role="status">Opening your Idea Studio…</p>}
    {error && <div role="alert" className={styles.error}>{error}<p><button onClick={() => setReload(value => value + 1)}>Try again</button></p></div>}
    {ready && join && <article className={styles.gate}><h2>Create your founder profile first.</h2><p>Your studio works from your own approved ideas.</p><Link className="button" href="/agent">Build my profile →</Link></article>}
    {ready && plan?.plan === 'free' && <article className={styles.gate}><span className="badge">PREMIUM DEVELOPMENT PREVIEW</span><h2>Give your idea a working plan.</h2><p>Premium adds a structured studio for each approved idea:</p><ul><li>Optional DeepSeek refinement of your approved brief, with an exact send preview.</li><li>A specific customer, current workaround and first product.</li><li>A risky assumption with a test that could change your mind.</li><li>An editable solution memo with copy and Markdown download.</li></ul><Link className="button" href="/plans">Explore plans →</Link><p className="muted">Billing is not connected. No payment is collected in this preview.</p></article>}
    {ready && plan?.plan === 'premium' && <>
      <p><span className="badge">PREMIUM PREVIEW · NO CHARGE</span></p>
      {!ideas.length ? <article className={styles.gate}><h2>Approve your first idea.</h2><p>Only explicitly published briefs can enter the studio. Your private background is not included.</p><Link className="button" href="/agent">Create an approved idea →</Link></article> : <>
        <label htmlFor="studio-idea">Choose an approved idea</label><select id="studio-idea" value={selectedId} onChange={event => { setSelectedId(event.target.value); setAnswers({ ...emptyAnswers }); setMarkdown(''); setDirty(false); setMessage(''); }}>
          {ideas.map(card => <option key={ideaKey(card)} value={ideaKey(card)}>{card.alias} — {card.approvedBlurb.slice(0, 85)}</option>)}
        </select>
        {idea && <article className={styles.enhancement}>
          <div className={styles.topline}><div><p className={styles.step}>OPTIONAL / DEEPSEEK IDEA ENHANCEMENT</p><h2>A sharper first experiment.</h2></div><span className="badge">APPROVED BRIEF v{idea.version}</span></div>
          <p>Ask DeepSeek to refine the customer, product wedge and next experiment. This cloud request goes through WYJ’s server to DeepSeek. It uses exactly the approved brief below, alongside WYJ’s refinement instructions. Your private intake, name, contact and questionnaire answers are excluded.</p>
          <details className={styles.payload} open><summary>Exact approved brief sent to DeepSeek</summary><pre>{JSON.stringify(approvedEnhancementInput(idea), null, 2)}</pre></details>
          <label className={styles.consent}><input type="checkbox" checked={enhancementConsent} disabled={enhancing} onChange={event => setEnhancementConsent(event.target.checked)}/><span>Send exactly this approved brief to DeepSeek to enhance this idea. I understand this leaves my device.</span></label>
          <div className={styles.toolbar}><button disabled={!enhancementConsent || enhancing} onClick={() => void enhance()}>{enhancing ? 'DeepSeek is refining your idea…' : 'Enhance with DeepSeek'}</button>{enhancing && <button className={styles.quiet} onClick={cancelEnhancement}>Stop waiting</button>}</div>
          {enhancing && <p role="status">Only your approved brief is being used. The draft will appear in the editable memo below.</p>}
          {enhancementError && <p role="alert" className={styles.error}>{enhancementError} Review the brief and try again, or build a local memo below.</p>}
          <p className="muted">Enhancing replaces the memo below, including edits. You can use the local questionnaire instead; it makes no cloud request.</p>
        </article>}
        {idea && <IdeaResearch idea={idea}/>}
        {idea && <div className={styles.layout}>
          <article className={styles.question}>
            <p className={styles.step}>LOCAL OPTION / Sharpen the first product</p><h2>One customer. One useful result.</h2>
            {field('customer', 'Who is the first customer?', 'Name a narrow role and situation, rather than an entire industry.')}
            {field('problem', 'What frustrating job are they doing?', 'Describe a recent task, its consequence and the moment it becomes painful.')}
            {field('workaround', 'What do they use today? (optional)', 'Include a real workaround if you know one. Unknown is better than an invented competitor claim.')}
            {field('wedge', 'What is your smallest useful product?', 'One workflow, a concrete output and what you will leave out of the first version.')}
            <div className={styles.answerGroup}><p className={styles.step}>02 / Make it falsifiable</p><h3>A test you could fail.</h3>
              {field('assumption', 'What must be true for this to work?', 'Choose the assumption that would make this direction pointless if it were false.')}
              {field('experiment', 'What will you do in the next 48 hours?', 'Specify who you can reach, what they will try and the artifact or action you will observe.')}
              {field('signal', 'What result changes your next step?', 'Choose a measurable outcome before testing. State what you will do if it happens—and if it does not.')}
              {field('dataAccess', 'What data and permission does the test need? (optional)', 'Use minimum necessary data and explain how a participant consents. Keep personal details out.')}
            </div>
            <button disabled={!!missing.length || enhancing} onClick={build}>{markdown ? 'Rebuild memo from these answers' : 'Build my solution memo'}</button>
            <p className="muted">{missing.length ? `${missing.length} required answers remain.` : 'Ready to structure your answers into a memo.'} Structured in this browser, using the existing WYJ memo format.</p>
            {markdown && <p className="muted">Rebuilding replaces the draft below, including manual edits.</p>}
          </article>
          <aside className={styles.aside}>
            <article><p className={styles.step}>YOUR APPROVED STARTING POINT</p><h2>{idea.alias}</h2><p className={styles.brief}>{idea.approvedBlurb}</p><p className="muted">Offers: {idea.offers.join(', ') || 'Not specified'}<br/>Looking for: {idea.seeks.join(', ') || 'Not specified'}</p><p className="muted">This page does not publish your new answers or replace your matching brief.</p></article>
            <article><p className={styles.step}>YOUR NEXT CUSTOMER CONVERSATION</p><h3>Listen before you pitch.</h3><ol className={styles.promptList}>{interviewPrompts(answers).map(prompt => <li key={prompt}>{prompt}</li>)}</ol></article>
            <article><p className={styles.step}>A USEFUL DIVISION OF WORK</p><h3>Try the partnership.</h3><p>You can own {idea.offers.join(' / ') || 'the skill you offer'}. Ask a partner with {idea.seeks.join(' / ') || 'the missing skill'} to own a different part of the test.</p><p>After mutual introduction, agree on the exact deliverable, contribution and deadline in your working trial.</p><Link className="secondary" href="/matches">Find your counterpart →</Link></article>
          </aside>
        </div>}
        {markdown && <article>
          <div className={styles.topline}><div><p className={styles.step}>03 / YOUR WORKING SOLUTION MEMO</p><h2>Take a clear next step.</h2></div><span className="badge">{enhancementSource ? 'DEEPSEEK DRAFT · NOT PUBLISHED' : 'LOCAL DRAFT · NOT SHARED'}</span></div>
          {enhancementSource && <p className="muted">Generated by DeepSeek · {enhancementSource.model} · approved brief v{enhancementSource.briefVersion}. Suggestions are hypotheses to verify.</p>}
          {message && <p role="status" className={styles.notice}>{message}</p>}
          {dirty && <p className={styles.revision}>Your answers changed after this memo was built. Rebuild to include them; rebuilding replaces edits.</p>}
          <div className={styles.toolbar}><button className={styles.quiet} aria-pressed={preview} onClick={() => setPreview(true)}>Preview</button><button className={styles.quiet} aria-pressed={!preview} onClick={() => setPreview(false)}>Edit Markdown</button></div>
          {preview ? <div className={styles.preview}><Markdown>{markdown}</Markdown></div> : <label htmlFor="studio-memo">Your editable memo<textarea id="studio-memo" className={styles.memo} value={markdown} maxLength={100000} onChange={event => { setMarkdown(event.target.value); setMessage(''); }}/></label>}
          <div className={styles.exports}><button onClick={() => void copy()}>Copy memo</button><button onClick={() => download(markdown)}>Download .md</button></div><p className={styles.footerNote}>Copy and download export exactly the draft shown here. Save it before leaving this page. No pitch is published, no person is contacted and no payment is collected.</p>
          <FounderReview key={selectedId} disabled={false} onInsert={text => { setMarkdown(current => current + text); setPreview(true); setMessage('Your selected review notes were added to this local draft.'); }}/>
        </article>}
      </>}
    </>}
  </section>;
}
