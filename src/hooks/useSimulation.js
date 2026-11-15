import { useEffect, useMemo, useReducer } from 'react';
import {
  TICK_INTERVAL_MS,
  createInitialState,
  simReducer,
} from '../simulation/engine.js';

export function useSimulation() {
  const [state, dispatch] = useReducer(
    simReducer,
    undefined,
    () => createInitialState({ running: true }),
  );

  useEffect(() => {
    if (!state.running) return undefined;
    const interval = window.setInterval(() => {
      dispatch({ type: 'TICK', realMs: TICK_INTERVAL_MS });
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [state.running]);

  const actions = useMemo(
    () => ({
      toggleRunning: () => dispatch({ type: 'TOGGLE_RUNNING' }),
      setSpeed: (speed) => dispatch({ type: 'SET_SPEED', speed }),
      setScenario: (scenario) => dispatch({ type: 'SET_SCENARIO', scenario }),
      dispatchManual: (stopId) =>
        dispatch({ type: 'DISPATCH_MANUAL', stopId }),
      prioritizeStop: (stopId) =>
        dispatch({ type: 'PRIORITIZE_STOP', stopId }),
      selectStop: (stopId) => dispatch({ type: 'SELECT_STOP', stopId }),
      reset: () => dispatch({ type: 'RESET' }),
    }),
    [],
  );

  return { state, actions };
}
