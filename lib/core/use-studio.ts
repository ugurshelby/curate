/**
 * Curate Core — useStudio React Hook
 * Connects React components directly to the headless StudioStateMachine
 * with optimal re-renders using useSyncExternalStore.
 */

import { useSyncExternalStore } from 'react';
import { studioStore } from './state-machine';
import { StudioState } from './types';

export function useStudio(): {
  state: StudioState;
  actions: typeof studioStore;
} {
  const state = useSyncExternalStore(
    (listener) => studioStore.subscribe(listener),
    () => studioStore.getState(),
    () => studioStore.getState()
  );

  return {
    state,
    actions: studioStore,
  };
}
