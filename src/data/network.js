/**
 * NEXUS transit mesh.
 * Coordinates are expressed in a 1000 x 580 viewBox and shared by the map,
 * simulation engine and routing helpers.
 */

export const STOPS = [
  {
    id: 'university',
    code: 'UNI',
    name: 'University',
    zone: 'North Academic',
    x: 142,
    y: 205,
    radius: 19,
    baseRate: 0.88,
    color: '#22d3ee',
  },
  {
    id: 'north',
    code: 'NRD',
    name: 'North Residential',
    zone: 'Residential North',
    x: 365,
    y: 86,
    radius: 18,
    baseRate: 0.64,
    color: '#34d399',
  },
  {
    id: 'stadium',
    code: 'STD',
    name: 'Stadium',
    zone: 'Event District',
    x: 655,
    y: 96,
    radius: 20,
    baseRate: 0.46,
    color: '#a78bfa',
  },
  {
    id: 'tech',
    code: 'TEC',
    name: 'Tech Park',
    zone: 'Innovation Corridor',
    x: 865,
    y: 198,
    radius: 18,
    baseRate: 0.76,
    color: '#22d3ee',
  },
  {
    id: 'central',
    code: 'CEN',
    name: 'Central Station',
    zone: 'Civic Core',
    x: 493,
    y: 278,
    radius: 23,
    baseRate: 1.18,
    color: '#34d399',
  },
  {
    id: 'mall',
    code: 'MAL',
    name: 'City Mall',
    zone: 'Retail Quarter',
    x: 231,
    y: 342,
    radius: 19,
    baseRate: 0.72,
    color: '#fbbf24',
  },
  {
    id: 'riverside',
    code: 'RIV',
    name: 'Riverside',
    zone: 'Riverside',
    x: 112,
    y: 488,
    radius: 18,
    baseRate: 0.38,
    color: '#34d399',
  },
  {
    id: 'medical',
    code: 'MED',
    name: 'Medical Center',
    zone: 'Health District',
    x: 350,
    y: 468,
    radius: 19,
    baseRate: 0.5,
    color: '#22d3ee',
  },
  {
    id: 'industrial',
    code: 'IND',
    name: 'Industrial Park',
    zone: 'South Industrial',
    x: 631,
    y: 443,
    radius: 18,
    baseRate: 0.53,
    color: '#fb923c',
  },
  {
    id: 'airport',
    code: 'AIR',
    name: 'Airport Terminal',
    zone: 'Gateway',
    x: 866,
    y: 497,
    radius: 21,
    baseRate: 0.65,
    color: '#22d3ee',
  },
];

export const NODE_MAP = Object.fromEntries(STOPS.map((stop) => [stop.id, stop]));

export const EDGES = [
  ['university', 'north'],
  ['university', 'mall'],
  ['university', 'central'],
  ['north', 'stadium'],
  ['north', 'central'],
  ['stadium', 'tech'],
  ['stadium', 'central'],
  ['tech', 'central'],
  ['tech', 'airport'],
  ['central', 'mall'],
  ['central', 'medical'],
  ['central', 'industrial'],
  ['mall', 'riverside'],
  ['mall', 'medical'],
  ['riverside', 'medical'],
  ['medical', 'industrial'],
  ['industrial', 'airport'],
];

export const ADJACENCY = STOPS.reduce((acc, stop) => {
  acc[stop.id] = [];
  return acc;
}, {});

EDGES.forEach(([a, b]) => {
  if (!ADJACENCY[a].includes(b)) ADJACENCY[a].push(b);
  if (!ADJACENCY[b].includes(a)) ADJACENCY[b].push(a);
});

export const DISTRICT_LABELS = [
  { label: 'NORTH RESIDENTIAL', x: 272, y: 48 },
  { label: 'ACADEMIC QUARTER', x: 106, y: 162 },
  { label: 'EVENT DISTRICT', x: 704, y: 55 },
  { label: 'INNOVATION CORRIDOR', x: 758, y: 150 },
  { label: 'CIVIC CORE', x: 430, y: 330 },
  { label: 'RETAIL QUARTER', x: 166, y: 389 },
  { label: 'HEALTH DISTRICT', x: 292, y: 535 },
  { label: 'INDUSTRIAL BELT', x: 646, y: 393 },
  { label: 'GATEWAY', x: 835, y: 562 },
];

export const CITY_BLOCKS = [
  { x: 58, y: 54, w: 132, h: 92, rx: 10 },
  { x: 228, y: 168, w: 88, h: 76, rx: 8 },
  { x: 300, y: 131, w: 148, h: 66, rx: 10 },
  { x: 542, y: 38, w: 78, h: 59, rx: 7 },
  { x: 724, y: 126, w: 110, h: 42, rx: 7 },
  { x: 800, y: 263, w: 114, h: 90, rx: 10 },
  { x: 595, y: 224, w: 122, h: 74, rx: 9 },
  { x: 287, y: 377, w: 105, h: 52, rx: 8 },
  { x: 481, y: 367, w: 98, h: 73, rx: 9 },
  { x: 74, y: 390, w: 90, h: 47, rx: 7 },
  { x: 704, y: 488, w: 93, h: 44, rx: 7 },
  { x: 254, y: 246, w: 88, h: 46, rx: 7 },
];

export const SCENARIOS = {
  normal: {
    id: 'normal',
    label: 'Normal',
    description: 'Baseline PM demand',
    arrivalMult: 1,
    stopWeights: {},
    accent: '#34d399',
  },
  rush: {
    id: 'rush',
    label: 'Rush Hour Surge',
    description: 'Commuter peak load',
    arrivalMult: 1.68,
    stopWeights: {
      central: 1.42,
      university: 1.28,
      tech: 1.3,
      north: 1.12,
      mall: 1.08,
    },
    accent: '#fbbf24',
  },
  stadium: {
    id: 'stadium',
    label: 'Stadium Event Spike',
    description: 'Event egress pressure',
    arrivalMult: 1.5,
    stopWeights: {
      stadium: 6.4,
      central: 1.35,
      mall: 1.18,
      tech: 1.08,
    },
    accent: '#f472b6',
  },
};

/** Smooth double-peak demand curve for the metro. */
export function timeOfDayFactor(minutes) {
  const hour = ((minutes / 60) % 24 + 24) % 24;
  const morning = 0.72 * Math.exp(-0.5 * ((hour - 8.1) / 1.25) ** 2);
  const evening = 0.9 * Math.exp(-0.5 * ((hour - 17.35) / 1.7) ** 2);
  const midday = 0.18 * Math.exp(-0.5 * ((hour - 12.7) / 2.4) ** 2);
  return 0.42 + morning + evening + midday;
}

/** Breadth-first search returning the full node path. */
export function pathBetween(startId, endId) {
  if (startId === endId) return [startId];
  if (!NODE_MAP[startId] || !NODE_MAP[endId]) return [];

  const queue = [startId];
  const visited = new Set([startId]);
  const parent = { [startId]: null };

  while (queue.length) {
    const current = queue.shift();
    if (current === endId) break;

    for (const neighbor of ADJACENCY[current] ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent[neighbor] = current;
      queue.push(neighbor);
    }
  }

  if (!visited.has(endId)) return [];
  const path = [];
  let cursor = endId;
  while (cursor) {
    path.unshift(cursor);
    cursor = parent[cursor];
  }
  return path;
}

export function nextHopToward(startId, endId) {
  const path = pathBetween(startId, endId);
  return path.length > 1 ? path[1] : startId;
}

export function hopDistance(startId, endId) {
  const path = pathBetween(startId, endId);
  return path.length ? path.length - 1 : 99;
}
