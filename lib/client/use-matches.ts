"use client";
import {useQuery} from '@tanstack/react-query';
import {fetchMatches,matchQueryKey} from './api';
// Enable only after real session creation succeeds. Never put private intake in this cache.
export function useMatches(sessionReady: boolean) {
 return useQuery({queryKey:matchQueryKey,queryFn:fetchMatches,enabled:sessionReady,refetchInterval:3000});
}
