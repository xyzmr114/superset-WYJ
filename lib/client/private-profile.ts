"use client";
import {createContext, useContext, useState, type ReactNode} from 'react';
import {createElement} from 'react';
import type {Opportunity} from '@/lib/contracts';

// =============================================================================
// PRIVATE INTAKE — browser memory ONLY.
//
// This value lives in React state for the life of the tab and nowhere else:
//   - never localStorage / sessionStorage / cookies / IndexedDB
//   - never an API request body, query string, or query-cache key
//     (sole exception: profileText may go to a classifier on this laptop's
//     loopback address — see components/private/localClassifier.ts)
//   - never a model prompt, analytics event, or error report
// Refreshing the tab erases it. There is deliberately no persistence.
// =============================================================================
export type PrivateProfile = {
  profileText: string; // Your own pasted profile (e.g. LinkedIn "About"). Only ever sent to a loopback classifier on this laptop.
  ambition: string;    // Why you would jump — the company you actually want to build.
  conditions: string;  // What would need to be true before you leap.
  mustHaves: string;   // Non-negotiables. Yours alone.
};

export const emptyPrivateProfile: PrivateProfile = {
  profileText: '',
  ambition: '',
  conditions: '',
  mustHaves: '',
};

type PrivateProfileStore = {
  profile: PrivateProfile;
  update: (patch: Partial<PrivateProfile>) => void;
  clear: () => void;
};

const PrivateProfileContext = createContext<PrivateProfileStore | null>(null);

// Kept in its own provider (not the shared demo/query context) so private data is
// structurally isolated from anything that could be published or cached.
export function PrivateProfileProvider({children}: {children: ReactNode}) {
  const [profile, setProfile] = useState<PrivateProfile>(emptyPrivateProfile);
  const update = (patch: Partial<PrivateProfile>) => setProfile(prev => ({...prev, ...patch}));
  const clear = () => setProfile(emptyPrivateProfile);
  return createElement(PrivateProfileContext.Provider, {value: {profile, update, clear}}, children);
}

export function usePrivateProfile(): PrivateProfileStore {
  const store = useContext(PrivateProfileContext);
  if (!store) throw new Error('usePrivateProfile must be used within <PrivateProfileProvider>');
  return store;
}

// =============================================================================
// LOCAL "Would I jump?" checklist.
//
// A pure function that runs entirely in the browser against the private profile.
// Its result is rendered locally and never transmitted. Items the user can't
// resolve from what they've entered stay 'unknown', never silently "satisfied".
// =============================================================================
export type CheckStatus = 'satisfied' | 'unknown' | 'unmet';
export type CheckItem = {id: string; label: string; status: CheckStatus; detail: string};

export function evaluateJump(profile: PrivateProfile, opportunity: Opportunity): CheckItem[] {
  return [
    {
      id: 'ambition',
      label: 'This direction matches something you actually want to build',
      status: profile.ambition.trim() ? 'satisfied' : 'unknown',
      detail: profile.ambition.trim()
        ? 'You described this ambition in private intake (stays on this device).'
        : 'Add your ambition in intake to judge this locally.',
    },
    {
      id: 'conditions',
      label: 'Your must-be-true conditions can be met',
      status: 'unknown',
      detail: profile.conditions.trim() || profile.mustHaves.trim()
        ? 'Only you can judge this. The other person has not disclosed their finances or intentions.'
        : 'No conditions recorded. Add them in intake — the other person never sees them.',
    },
    {
      id: 'experiment',
      label: 'There is a concrete first step you could take this week',
      status: opportunity.nextExperiment ? 'satisfied' : 'unknown',
      detail: opportunity.nextExperiment || 'No first experiment has been proposed yet.',
    },
  ];
}
