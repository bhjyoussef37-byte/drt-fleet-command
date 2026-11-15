/**
 * Headless smoke test for the simulation core (no browser required).
 * Run with: npm run smoke
 */
import assert from 'node:assert/strict';
import {
  SIM_MINUTES_PER_SECOND,
  TOTAL_FLEET,
  createInitialState,
  selectMetrics,
  simReducer,
} from '../src/simulation/engine.js';
import { buildForecast } from '../src/lib/forecast.js';

const results = [];
const check = (name, fn) => {
  fn();
  results.push(name);
};

const initial = createInitialState({ running: true });

check('network boots with 10 stops and 8 fleet units', () => {
  assert.equal(initial.stops.length, 10);
  assert.equal(initial.buses.length, TOTAL_FLEET);
  assert.equal(initial.running, true);
});

check('fleet starts with 5 active units and 3 in depot reserve', () => {
  const metrics = selectMetrics(initial);
  assert.equal(metrics.activeFleet, 5);
  assert.equal(metrics.parkedFleet, 3);
  assert.equal(metrics.utilization, 63);
});

check('tick advances the clock and ages queued passengers', () => {
  const before = initial.stops.reduce(
    (sum, stop) => sum + stop.waiting.reduce((s, p) => s + p.wait, 0),
    0,
  );
  const next = simReducer(initial, { type: 'TICK', realMs: 2000 });
  const after = next.stops.reduce(
    (sum, stop) => sum + stop.waiting.reduce((s, p) => s + p.wait, 0),
    0,
  );
  assert.ok(next.simMinutes > initial.simMinutes);
  assert.ok(after >= before, 'total accumulated wait should not decrease from aging');
});

check('paused simulation freezes the clock', () => {
  const paused = simReducer(initial, { type: 'TOGGLE_RUNNING' });
  const frozen = simReducer(paused, { type: 'TICK', realMs: 5000 });
  assert.equal(frozen.simMinutes, paused.simMinutes);
  assert.equal(frozen.running, false);
});

check('speed is constrained to 1x / 2x / 5x', () => {
  assert.equal(simReducer(initial, { type: 'SET_SPEED', speed: 2 }).speed, 2);
  assert.equal(simReducer(initial, { type: 'SET_SPEED', speed: 9 }).speed, initial.speed);
});

check('scenario switch injects demand and re-weights the forecast', () => {
  const rush = simReducer(initial, { type: 'SET_SCENARIO', scenario: 'rush' });
  assert.equal(rush.scenario, 'rush');
  assert.ok(selectMetrics(rush).waitingTotal > selectMetrics(initial).waitingTotal);
  assert.ok(rush.logs[0].message.includes('Heure de pointe'));

  const stadium = simReducer(initial, { type: 'SET_SCENARIO', scenario: 'stadium' });
  const stadiumForecast = buildForecast({
    simMinutes: initial.simMinutes,
    scenarioId: 'stadium',
    stops: stadium.stops,
  });
  assert.equal(stadiumForecast.hotspots[0].id, 'maarif');
});

check('manual dispatch deploys all reserve units then disables', () => {
  let state = initial;
  for (let i = 0; i < 3; i += 1) {
    state = simReducer(state, { type: 'DISPATCH_MANUAL' });
  }
  assert.equal(selectMetrics(state).activeFleet, TOTAL_FLEET);
  assert.equal(selectMetrics(state).parkedFleet, 0);
  const blocked = simReducer(state, { type: 'DISPATCH_MANUAL' });
  assert.match(blocked.logs[0].message, /refusé/i);
});

check('priority dispatch reroutes the closest unit', () => {
  const stop = initial.stops.find((entry) => entry.id === 'ain-diab');
  const next = simReducer(initial, { type: 'PRIORITIZE_STOP', stopId: stop.id });
  assert.ok(next.logs[0].message.includes('Aïn Diab'));
  assert.ok(next.buses.some((bus) => bus.target === 'ain-diab'));
});

check('forecast returns 15 / 30 / 60 minute horizons with hotspots', () => {
  const forecast = buildForecast({
    simMinutes: initial.simMinutes,
    scenarioId: 'normal',
    stops: initial.stops,
  });
  assert.deepEqual(
    forecast.bins.map((bin) => bin.label),
    ['+15m', '+30m', '+45m', '+60m'],
  );
  assert.deepEqual(
    forecast.horizons.map((horizon) => horizon.minutes),
    [15, 30, 60],
  );
  assert.equal(forecast.totals[60], forecast.bins.reduce((sum, bin) => sum + bin.value, 0));
  assert.equal(forecast.hotspots.length, 3);
  assert.ok(forecast.confidence > 90 && forecast.confidence <= 100);
});

check('reset restores the paused baseline', () => {
  let state = simReducer(initial, { type: 'SET_SCENARIO', scenario: 'rush' });
  state = simReducer(state, { type: 'DISPATCH_MANUAL' });
  state = simReducer(state, { type: 'RESET' });
  const metrics = selectMetrics(state);
  assert.equal(state.running, false);
  assert.equal(state.scenario, 'normal');
  assert.equal(metrics.activeFleet, 5);
  assert.equal(metrics.parkedFleet, 3);
});

check('long run keeps fleet and queues within bounds', () => {
  let state = simReducer(initial, { type: 'SET_SCENARIO', scenario: 'stadium' });
  state = simReducer(state, { type: 'SET_SPEED', speed: 5 });
  for (let i = 0; i < 400; i += 1) {
    state = simReducer(state, { type: 'TICK', realMs: 125 });
    assert.equal(state.buses.length, TOTAL_FLEET);
    assert.ok(state.stops.every((stop) => stop.waiting.length <= 60));
  }
  assert.ok(state.servedTotal >= initial.servedTotal);
  assert.ok(state.simMinutes > initial.simMinutes + 30);
  assert.ok(state.logs.length <= 80);
});

check('simulation speed constant stays positive', () => {
  assert.ok(SIM_MINUTES_PER_SECOND > 0);
});

console.log(
  JSON.stringify(
    { result: 'PASS', checks: results.length, tests: results },
    null,
    2,
  ),
);
