import { writeFileSync, mkdirSync } from 'node:fs';
import { STOPS, SCENARIOS } from '../src/data/network.js';

mkdirSync(new URL('../ml', import.meta.url), { recursive: true });

const payload = {
  stops: STOPS.map(({ id, name, zone, baseRate, lines }) => ({
    id,
    name,
    zone,
    baseRate,
    lines,
  })),
  scenarios: Object.values(SCENARIOS).map(({ id, label, description, arrivalMult, stopWeights }) => ({
    id,
    label,
    description,
    arrivalMult,
    stopWeights,
  })),
};

writeFileSync(
  new URL('../ml/network.json', import.meta.url),
  JSON.stringify(payload, null, 2),
  'utf8',
);

console.log(`Exported ${payload.stops.length} stops and ${payload.scenarios.length} scenarios to ml/network.json`);
