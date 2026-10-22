import { classifyLocally as classifyOnDevice, unavailableClassification, type LocalClassification } from './classifier-contract';
export type { LocalClassification } from './classifier-contract';

/** Compatibility entry point for our intake: only profile and idea, never private conditions. */
export function classifyLocally(profile: string, idea: string): Promise<LocalClassification> {
  if (typeof window === 'undefined') return Promise.resolve(unavailableClassification('not_browser'));
  if (profile.length + idea.length > 12000) return Promise.resolve(unavailableClassification('invalid_response'));
  const text = [profile.trim() && `Profile: ${profile.trim()}`, idea.trim() && `Idea: ${idea.trim()}`].filter(Boolean).join('\n');
  return classifyOnDevice(text);
}
