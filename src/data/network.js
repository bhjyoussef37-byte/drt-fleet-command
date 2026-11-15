/**
 * Casabus-inspired transit mesh for Casablanca.
 * Coordinates are expressed in a 1000 x 580 viewBox and shared by the map,
 * simulation engine and routing helpers.
 */

export const STOPS = [
  {
    id: 'casa-port',
    code: 'CPT',
    name: 'Casa Port',
    zone: 'Sidi Belyout',
    x: 168,
    y: 162,
    radius: 22,
    baseRate: 1.22,
    color: '#ffd400',
    lines: ['L01', 'L10', 'L20'],
  },
  {
    id: 'anfa',
    code: 'ANF',
    name: 'Anfa',
    zone: 'Anfa',
    x: 218,
    y: 288,
    radius: 19,
    baseRate: 0.84,
    color: '#ffd400',
    lines: ['L10', 'L33'],
  },
  {
    id: 'ain-diab',
    code: 'ADI',
    name: 'Aïn Diab',
    zone: 'Anfa Littoral',
    x: 96,
    y: 430,
    radius: 18,
    baseRate: 0.52,
    color: '#ffd400',
    lines: ['L20', 'L60'],
  },
  {
    id: 'maarif',
    code: 'MRF',
    name: 'Maârif',
    zone: 'Maârif',
    x: 374,
    y: 236,
    radius: 21,
    baseRate: 1.08,
    color: '#ffd400',
    lines: ['L01', 'L10', 'L40'],
  },
  {
    id: 'habous',
    code: 'HBS',
    name: 'Habous',
    zone: 'Habous',
    x: 340,
    y: 372,
    radius: 18,
    baseRate: 0.66,
    color: '#ffd400',
    lines: ['L15', 'L33'],
  },
  {
    id: 'casa-voyageurs',
    code: 'CVY',
    name: 'Casa Voyageurs',
    zone: 'Belvédère',
    x: 558,
    y: 312,
    radius: 23,
    baseRate: 1.15,
    color: '#ffd400',
    lines: ['L01', 'L20', 'L40', 'L70'],
  },
  {
    id: 'hay-hassani',
    code: 'HHS',
    name: 'Hay Hassani',
    zone: 'Hay Hassani',
    x: 575,
    y: 494,
    radius: 18,
    baseRate: 0.62,
    color: '#ffd400',
    lines: ['L40', 'L60'],
  },
  {
    id: 'oasis',
    code: 'OAS',
    name: 'Oasis',
    zone: 'Oasis',
    x: 768,
    y: 438,
    radius: 19,
    baseRate: 0.7,
    color: '#ffd400',
    lines: ['L60', 'L70', 'L90'],
  },
  {
    id: 'ain-sebaa',
    code: 'ASB',
    name: 'Aïn Sebaâ',
    zone: 'Aïn Sebaâ',
    x: 752,
    y: 154,
    radius: 19,
    baseRate: 0.74,
    color: '#ffd400',
    lines: ['L20', 'L70'],
  },
  {
    id: 'sidi-moumen',
    code: 'SDM',
    name: 'Sidi Moumen',
    zone: 'Sidi Moumen',
    x: 902,
    y: 294,
    radius: 19,
    baseRate: 0.58,
    color: '#ffd400',
    lines: ['L70', 'L90'],
  },
];

export const NODE_MAP = Object.fromEntries(STOPS.map((stop) => [stop.id, stop]));

export const EDGES = [
  ['casa-port', 'anfa'],
  ['casa-port', 'maarif'],
  ['casa-port', 'habous'],
  ['anfa', 'ain-diab'],
  ['anfa', 'maarif'],
  ['ain-diab', 'hay-hassani'],
  ['maarif', 'habous'],
  ['maarif', 'casa-voyageurs'],
  ['habous', 'casa-voyageurs'],
  ['habous', 'hay-hassani'],
  ['casa-voyageurs', 'ain-sebaa'],
  ['casa-voyageurs', 'oasis'],
  ['casa-voyageurs', 'hay-hassani'],
  ['hay-hassani', 'oasis'],
  ['ain-sebaa', 'sidi-moumen'],
  ['oasis', 'sidi-moumen'],
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
  { label: 'SIDI BELYOUT', x: 210, y: 96 },
  { label: 'ANFA', x: 150, y: 332 },
  { label: 'MAÂRIF', x: 386, y: 158 },
  { label: 'HABOUS', x: 286, y: 426 },
  { label: 'BELVÉDÈRE', x: 536, y: 226 },
  { label: 'HAY HASSANI', x: 486, y: 552 },
  { label: 'OASIS', x: 752, y: 504 },
  { label: 'AÏN SEBAÂ', x: 710, y: 94 },
  { label: 'SIDI MOUMEN', x: 858, y: 244 },
  { label: 'OCÉAN ATLANTIQUE', x: 46, y: 552 },
];

export const CITY_BLOCKS = [
  { x: 260, y: 72, w: 108, h: 62, rx: 9 },
  { x: 420, y: 92, w: 128, h: 58, rx: 9 },
  { x: 602, y: 66, w: 88, h: 54, rx: 7 },
  { x: 250, y: 300, w: 86, h: 58, rx: 8 },
  { x: 420, y: 382, w: 108, h: 48, rx: 7 },
  { x: 636, y: 348, w: 88, h: 58, rx: 8 },
  { x: 790, y: 380, w: 108, h: 72, rx: 9 },
  { x: 660, y: 216, w: 76, h: 48, rx: 7 },
  { x: 842, y: 174, w: 78, h: 48, rx: 7 },
  { x: 472, y: 238, w: 58, h: 46, rx: 7 },
  { x: 130, y: 330, w: 66, h: 46, rx: 7 },
  { x: 300, y: 470, w: 96, h: 38, rx: 7 },
  { x: 500, y: 520, w: 78, h: 38, rx: 6 },
  { x: 738, y: 522, w: 98, h: 38, rx: 6 },
];

/** Decorative Atlantic coastline used by the map. */
export const COASTLINE =
  'M 0 580 C 30 468 40 404 58 330 C 80 250 96 190 120 140 C 146 86 150 38 148 0';

export const SCENARIOS = {
  normal: {
    id: 'normal',
    label: 'Trafic normal',
    description: 'Demande PM de base',
    arrivalMult: 1,
    stopWeights: {},
    accent: '#ffd400',
  },
  rush: {
    id: 'rush',
    label: 'Heure de pointe',
    description: 'Pic des navetteurs',
    arrivalMult: 1.68,
    stopWeights: {
      'casa-port': 1.42,
      maarif: 1.3,
      'casa-voyageurs': 1.38,
      'ain-sebaa': 1.18,
      anfa: 1.08,
    },
    accent: '#fb923c',
  },
  stadium: {
    id: 'stadium',
    label: 'Match au Complexe',
    description: 'Afflux au Complexe Mohammed V',
    arrivalMult: 1.55,
    stopWeights: {
      maarif: 6.2,
      'casa-voyageurs': 1.4,
      'casa-port': 1.25,
      habous: 1.15,
    },
    accent: '#f43f5e',
  },
};

/** Smooth double-peak demand curve for Casablanca. */
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
