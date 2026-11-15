import model from '../data/demand-model.json' with { type: 'json' };
import { timeOfDayFactor } from '../data/network.js';

/**
 * Pure-JavaScript evaluator for the gradient boosting model trained in Python
 * (ml/train.py). The trees are exported as JSON so the static GitHub Pages build
 * can run the model without a backend.
 */
const featureIndex = new Map(model.features.map((name, index) => [name, index]));

function treePredict(tree, x) {
  let node = 0;
  while (tree.left[node] !== -1) {
    const feature = tree.feature[node];
    const threshold = tree.threshold[node];
    node =
      x[feature] <= threshold ? tree.left[node] : tree.right[node];
  }
  return tree.value[node];
}

export function predictDemand(features) {
  if (!Array.isArray(features) || features.length !== model.features.length) {
    throw new Error('Invalid feature vector for demand model');
  }
  let raw = model.init_prediction;
  for (const tree of model.trees) {
    raw += model.learning_rate * treePredict(tree, features);
  }
  if (model.log_target) {
    return Math.max(0, Math.expm1(raw));
  }
  return Math.max(0, raw);
}

export function buildFeatureVector({
  stop,
  simMinutes,
  scenario,
  waitingCount,
  avgWait = 0,
  longestWait = 0,
}) {
  const hour = (simMinutes / 60) % 24;
  const futureFactor = timeOfDayFactor(simMinutes + 15);
  const stopWeight = scenario.stopWeights?.[stop.id] ?? 1;
  const expected15 = stop.baseRate * futureFactor * scenario.arrivalMult * stopWeight * 15;
  return [
    stop.baseRate,
    futureFactor,
    scenario.arrivalMult,
    stopWeight,
    waitingCount,
    avgWait,
    longestWait,
    Math.sin((2 * Math.PI * hour) / 24),
    Math.cos((2 * Math.PI * hour) / 24),
    (7 <= hour && hour <= 9.5) || (16.5 <= hour && hour <= 19.5) ? 1 : 0,
    expected15,
    stop.id === 'casa-voyageurs' || stop.id === 'maarif' ? 1 : 0,
  ];
}

export const MODEL_META = {
  algorithm: model.algorithm,
  metrics: model.metrics,
  trainedAt: model.trained_at,
  version: model.version,
  features: model.features,
};

// Re-export to avoid a second import in forecast.js.
export { timeOfDayFactor } from '../data/network.js';
