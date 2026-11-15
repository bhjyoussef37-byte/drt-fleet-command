import model from '../data/decision-model.json' with { type: 'json' };
import { hopDistance, SCENARIOS, timeOfDayFactor } from '../data/network.js';
import { estimateStopPressure } from '../lib/forecast.js';

function relu(value) {
  return value > 0 ? value : 0;
}

export function predictCost(features) {
  if (!Array.isArray(features) || features.length !== model.features.length) {
    throw new Error('Invalid feature vector for decision model');
  }
  const scaled = features.map(
    (value, index) =>
      (value - model.scaler.mean[index]) / Math.max(model.scaler.scale[index], 1e-8),
  );
  let activation = scaled;
  for (let layerIndex = 0; layerIndex < model.layers.length; layerIndex += 1) {
    const layer = model.layers[layerIndex];
    const output = new Array(layer.bias.length).fill(0);
    for (let j = 0; j < layer.bias.length; j += 1) {
      let sum = layer.bias[j];
      for (let i = 0; i < activation.length; i += 1) {
        sum += activation[i] * layer.weights[i][j];
      }
      const isLast = layerIndex === model.layers.length - 1;
      output[j] = isLast ? sum : relu(sum);
    }
    activation = output;
  }
  const value = activation[0];
  return Number.isFinite(value) ? value : 0;
}

export function buildDecisionFeatures(bus, stop, state) {
  const scenario = SCENARIOS[state.scenario] ?? SCENARIOS.normal;
  const waiting = stop.waiting ?? [];
  const avgWait = waiting.length
    ? waiting.reduce((sum, passenger) => sum + passenger.wait, 0) / waiting.length
    : 0;
  const longestWait = waiting.reduce(
    (max, passenger) => Math.max(max, passenger.wait),
    0,
  );
  const progress = bus.progress ?? 0;
  const hop = hopDistance(bus.to, stop.id);
  const predicted = estimateStopPressure({
    stop,
    simMinutes: state.simMinutes,
    scenarioId: state.scenario,
  });
  const hour = (state.simMinutes / 60) % 24;
  const assigned = (state.buses ?? []).filter(
    (entry) => entry.id !== bus.id && entry.target === stop.id,
  ).length;
  return [
    progress,
    bus.onboard ?? 0,
    bus.capacity ?? 8,
    hop,
    (hop + (1 - progress)) * 2.15,
    waiting.length,
    avgWait,
    longestWait,
    predicted,
    assigned,
    scenario.arrivalMult,
    timeOfDayFactor(state.simMinutes),
    stop.id === 'casa-voyageurs' || stop.id === 'maarif' ? 1 : 0,
  ];
}

export const DECISION_MODEL_META = {
  type: model.type,
  metrics: model.metrics,
  trainedAt: model.trained_at,
  features: model.features,
  layers: model.layers.length,
};
