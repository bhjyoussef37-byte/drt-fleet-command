import { SCENARIOS, STOPS, timeOfDayFactor } from '../data/network.js';

const BIN_PROFILES = {
  normal: [0.88, 0.98, 1.1, 1.2],
  rush: [1.06, 1.13, 1.18, 1.16],
  stadium: [0.64, 0.92, 1.55, 1.42],
};

function sumWaiting(stops) {
  return stops.reduce((total, stop) => total + (stop.waiting?.length ?? 0), 0);
}

/**
 * A deterministic, demo-friendly stand-in for the production gradient-boosted
 * forecaster. It combines time-of-day history, live queue pressure and the
 * selected scenario into four 15-minute demand bins.
 */
export function buildForecast({ simMinutes, scenarioId = 'normal', stops = [] }) {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS.normal;
  const profile = BIN_PROFILES[scenarioId] ?? BIN_PROFILES.normal;
  const waitingTotal = sumWaiting(stops);
  const waitingByStop = Object.fromEntries(
    stops.map((stop) => [stop.id, stop.waiting?.length ?? 0]),
  );

  const bins = [0, 1, 2, 3].map((index) => {
    const midpoint = simMinutes + index * 15 + 7.5;
    const factor = timeOfDayFactor(midpoint);
    let value = 0;

    for (const stop of STOPS) {
      const stopWeight = scenario.stopWeights?.[stop.id] ?? 1;
      value += stop.baseRate * factor * scenario.arrivalMult * stopWeight * 15;
    }

    value *= profile[index];
    // Live queues feed the immediate horizon of the model.
    value += waitingTotal * (index === 0 ? 0.12 : index === 1 ? 0.05 : 0.02);

    return {
      index,
      label: `+${(index + 1) * 15}m`,
      value: Math.max(0, Math.round(value)),
    };
  });

  const totals = {
    15: bins[0].value,
    30: bins[0].value + bins[1].value,
    60: bins.reduce((sum, bin) => sum + bin.value, 0),
  };

  const normalFactor = timeOfDayFactor(simMinutes + 30);
  const normal30 = STOPS.reduce(
    (sum, stop) => sum + stop.baseRate * normalFactor * 30,
    0,
  );

  const horizons = [15, 30, 60].map((minutes) => {
    const value =
      minutes === 15 ? totals[15] : minutes === 30 ? totals[30] : totals[60];
    let delta;
    if (scenarioId === 'normal') {
      delta = Math.round(((value / (normal30 * (minutes / 30))) - 1) * 100);
    } else {
      delta = Math.round(
        ((value / (normal30 * (minutes / 30))) - 1) * 100,
      );
    }
    return { minutes, value, delta };
  });

  const hotspotFactor = timeOfDayFactor(simMinutes + 15);
  const hotspots = STOPS.map((stop) => {
    const weight = scenario.stopWeights?.[stop.id] ?? 1;
    const predicted = Math.round(
      stop.baseRate *
        hotspotFactor *
        scenario.arrivalMult *
        weight *
        30 *
        (1 + ((waitingByStop[stop.id] ?? 0) / 32) * 0.28),
    );
    const liveWait = stops.find((entry) => entry.id === stop.id)?.waiting ?? [];
    const longestWait = liveWait.reduce(
      (max, passenger) => Math.max(max, passenger.wait),
      0,
    );
    return {
      ...stop,
      predicted,
      waiting: liveWait.length,
      longestWait,
      lift: Math.max(
        1,
        Math.round(
          ((predicted / (stop.baseRate * hotspotFactor * 30)) - 1) * 100,
        ),
      ),
    };
  })
    .sort((a, b) => b.predicted + b.waiting * 2 - (a.predicted + a.waiting * 2))
    .slice(0, 3);

  const confidence = 93.2 + Math.sin((simMinutes + 11) * 0.37) * 1.7;
  const peakBin = bins.reduce(
    (best, bin) => (bin.value > best.value ? bin : best),
    bins[0],
  );

  return {
    bins,
    totals,
    horizons,
    hotspots,
    confidence: Number(confidence.toFixed(1)),
    peakBin,
    waitingTotal,
    surgeActive: scenarioId !== 'normal',
  };
}

/** Estimated total inbound trips in the next 30 minutes for a single stop. */
export function estimateStopPressure({
  stop,
  simMinutes,
  scenarioId = 'normal',
}) {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS.normal;
  const weight = scenario.stopWeights?.[stop.id] ?? 1;
  return (
    stop.baseRate *
    timeOfDayFactor(simMinutes + 15) *
    scenario.arrivalMult *
    weight *
    30
  );
}
