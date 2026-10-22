import { sanitizeClassification, unavailableClassification, type LocalClassification } from './classifier-contract';

export const BROWSER_MODEL_URL = '/models/laya/';
export const BROWSER_RUNTIME_URL = '/laya-runtime/worker.mjs';
let active: Worker | null = null;
let rejectActive: (() => void) | null = null;

/** Cancels the running task and releases model memory; model cache contains only public weights. */
export function stopBrowserClassifier(): void {
  active?.terminate(); active = null;
  rejectActive?.(); rejectActive = null;
}

/** No network request contains this input: text crosses only the browser's own worker boundary. */
export function browserClassifierText(profile: string, idea: string): string | null {
  if (profile.length + idea.length > 12000) return null;
  return [profile.trim() && `Profile: ${profile.trim()}`, idea.trim() && `Idea: ${idea.trim()}`].filter(Boolean).join('\n');
}

export async function classifyInBrowser(profile: string, idea: string, onProgress?: (message: string) => void, signal?: AbortSignal): Promise<LocalClassification> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return unavailableClassification('not_browser');
  const text = browserClassifierText(profile, idea);
  if (text === null) return unavailableClassification('invalid_response');
  if (!text) return unavailableClassification('empty_input');
  if (signal?.aborted) return unavailableClassification('not_running');
  // A new request supersedes the old task; never retain text beyond its request.
  if (rejectActive) stopBrowserClassifier();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: LocalClassification) => {
      if (settled) return; settled = true;
      signal?.removeEventListener('abort', cancel);
      if (active) { active.onmessage = null; active.onerror = null; }
      rejectActive = null; resolve(result);
    };
    const cancel = () => { active?.terminate(); active = null; finish({ ...unavailableClassification('not_running'), message: 'Browser classification stopped. Your text was not sent to a server. You can fill in the brief yourself.' }); };
    rejectActive = cancel;
    signal?.addEventListener('abort', cancel, {once:true});
    try {
      active ??= new Worker(BROWSER_RUNTIME_URL, { type: 'module', name: 'wyj-private-laya' });
      active.onmessage = ({data}: MessageEvent) => {
        if (data?.type === 'progress' && typeof data.message === 'string') onProgress?.(data.message);
        if (data?.type === 'result') finish(sanitizeClassification(data.result));
        if (data?.type === 'error') { active?.terminate(); active = null; finish({ ...unavailableClassification('not_running'), message: 'The browser model could not run on this device. Nothing was sent for remote inference. Fill in your brief yourself or try a shorter profile on a desktop browser.' }); }
      };
      active.onerror = () => { active?.terminate(); active = null; finish({ ...unavailableClassification('not_running'), message: 'The browser model could not load. Your profile stayed on this device. You can still fill in your brief yourself.' }); };
      active.postMessage({ type: 'classify', text });
    } catch { cancel(); }
  });
}
