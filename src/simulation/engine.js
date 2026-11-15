import {
  NODE_MAP,
  SCENARIOS,
  STOPS,
  hopDistance,
  nextHopToward,
  timeOfDayFactor,
} from '../data/network.js';
import { buildForecast } from '../lib/forecast.js';
import { predictCost, buildDecisionFeatures } from '../lib/decisionModel.js';
import { average, clamp } from '../lib/format.js';

export const TOTAL_FLEET = 8;
export const SIM_MINUTES_PER_SECOND = 0.3;
export const TICK_INTERVAL_MS = 125;
export const MAX_WAITING = 60;
const MAX_LOGS = 80;
const BUS_CAPACITY = 16;
const START_MINUTE = 16 * 60 + 18;

const BUS_COLORS = [
  '#ffd400',
  '#f5c518',
  '#ffde59',
  '#fbbf24',
  '#f59e0b',
  '#fde047',
  '#eab308',
  '#fb923c',
];

const INITIAL_BUSES = [
  {
    id: 'CASA-01',
    line: '1',
    from: 'casa-port',
    to: 'maarif',
    progress: 0.42,
    target: 'casa-voyageurs',
    onboard: 3,
    trips: 6,
    status: 'active',
  },
  {
    id: 'CASA-02',
    line: '7',
    from: 'ain-sebaa',
    to: 'casa-voyageurs',
    progress: 0.66,
    target: 'casa-voyageurs',
    onboard: 2,
    trips: 9,
    status: 'active',
  },
  {
    id: 'CASA-03',
    line: '60',
    from: 'oasis',
    to: 'casa-voyageurs',
    progress: 0.3,
    target: 'hay-hassani',
    onboard: 0,
    trips: 4,
    status: 'active',
  },
  {
    id: 'CASA-04',
    line: '1',
    from: 'maarif',
    to: 'anfa',
    progress: 0.55,
    target: 'anfa',
    onboard: 4,
    trips: 7,
    status: 'active',
  },
  {
    id: 'CASA-05',
    line: '5',
    from: 'habous',
    to: 'hay-hassani',
    progress: 0.22,
    target: 'hay-hassani',
    onboard: 1,
    trips: 5,
    status: 'active',
  },
  {
    id: 'CASA-06',
    line: '1',
    from: 'casa-voyageurs',
    to: 'maarif',
    progress: 0,
    target: null,
    onboard: 0,
    trips: 0,
    status: 'depot',
  },
  {
    id: 'CASA-07',
    line: '15',
    from: 'casa-voyageurs',
    to: 'habous',
    progress: 0,
    target: null,
    onboard: 0,
    trips: 0,
    status: 'depot',
  },
  {
    id: 'CASA-08',
    line: '70',
    from: 'casa-voyageurs',
    to: 'ain-sebaa',
    progress: 0,
    target: null,
    onboard: 0,
    trips: 0,
    status: 'depot',
  },
];

const SEED_LOGS = [
  {
    tag: 'RÉSEAU',
    level: 'success',
    message: 'Maillage Casabus synchronisé. 10 / 10 arrêts transmettent la demande en direct.',
    detail: 'Capteurs du réseau v4.2 · latence 12 ms',
    ago: 0.2,
  },
  {
    tag: 'PRÉVISION',
    level: 'info',
    message: 'Pic de pointe détecté. Le modèle prévoit une hausse de la demande jusqu’à 17:30.',
    detail: 'Modèle gradient boosting · confiance 94,1 %',
    ago: 1.2,
  },
  {
    tag: 'DÉPLOIEMENT',
    level: 'success',
    message: 'CASA-04 dessert Maârif → Anfa avec 4 voyageurs à bord.',
    detail: 'ETA 2,4 min · à l’heure',
    ago: 2.4,
  },
  {
    tag: 'OPTIMISEUR',
    level: 'info',
    message: 'L’optimiseur maintient 3 unités en réserve pour absorber les pics de demande.',
    detail: 'Réserve 37,5 % · horizon de rééquilibrage 20 min',
    ago: 3.7,
  },
  {
    tag: 'ALERTE',
    level: 'warning',
    message: 'File d’attente à Casa Port proche de 9 min d’attente moyenne.',
    detail: 'Candidat priorité auto · surveillance',
    ago: 4.8,
  },
];

function createPassenger(id, wait = 0) {
  return { id, wait };
}

function averageWait(stops) {
  const passengers = stops.flatMap((stop) => stop.waiting);
  if (!passengers.length) return 0;
  return average(passengers.map((passenger) => passenger.wait));
}

function busiestStop(stops) {
  return [...stops].sort((a, b) => {
    const aScore =
      a.waiting.length * 4 +
      a.waiting.reduce((sum, passenger) => sum + passenger.wait, 0);
    const bScore =
      b.waiting.length * 4 +
      b.waiting.reduce((sum, passenger) => sum + passenger.wait, 0);
    return bScore - aScore;
  })[0];
}

function logEntry(state, tag, level, message, detail) {
  return {
    id: state.nextLogId,
    time: state.simMinutes,
    tag,
    level,
    message,
    detail,
  };
}

function withLog(state, tag, level, message, detail) {
  const entry = logEntry(state, tag, level, message, detail);
  return {
    ...state,
    logs: [entry, ...state.logs].slice(0, MAX_LOGS),
    nextLogId: state.nextLogId + 1,
  };
}

function notice(message, tone = 'success') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    tone,
  };
}

/**
 * Target selection for an empty/route-complete vehicle. Live queue pressure
 * dominates, with a smaller contribution from the 15-minute forecast and
 * penalties that discourage multiple buses from stacking on one stop.
 */
function chooseBusTarget({ bus, stops, buses, scenarioId, simMinutes }) {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS.normal;
  const factor = timeOfDayFactor(simMinutes);
  const assigned = {};

  for (const other of buses) {
    if (other.id === bus.id || other.status !== 'active' || !other.target) continue;
    assigned[other.target] = (assigned[other.target] ?? 0) + 1;
  }

  let best = null;
  let bestScore = -Infinity;

  for (const stop of stops) {
    if (stop.id === bus.to) continue;
    const weight = scenario.stopWeights?.[stop.id] ?? 1;
    const longestWait = stop.waiting.reduce(
      (max, passenger) => Math.max(max, passenger.wait),
      0,
    );
    const predicted =
      stop.baseRate * factor * scenario.arrivalMult * weight * 15;
    const hops = hopDistance(bus.to, stop.id);
    const score =
      stop.waiting.length * 6.2 +
      longestWait * 1.8 +
      predicted * 0.72 -
      hops * 2.15 -
      (assigned[stop.id] ?? 0) * 7 +
      Math.random() * 0.8;

    if (score > bestScore) {
      bestScore = score;
      best = stop;
    }
  }

  return best?.id ?? 'casa-voyageurs';
}

function selectBestBus(stop, buses, context) {
  const candidates = buses.filter(
    (bus) => bus.status === 'active' && bus.target !== stop.id,
  );
  if (!candidates.length) return null;

  let best = candidates[0];
  let bestScore = Infinity;
  for (const bus of candidates) {
    let score;
    try {
      score = predictCost(buildDecisionFeatures(bus, stop, context));
    } catch {
      score =
        hopDistance(bus.to, stop.id) +
        (1 - (bus.progress ?? 0)) -
        (bus.target === stop.id ? 0.9 : 0);
    }
    if (Number.isFinite(score) && score < bestScore) {
      bestScore = score;
      best = bus;
    }
  }
  return best;
}

export function createInitialState({ running = true } = {}) {
  const simMinutes = START_MINUTE;
  let nextPassengerId = 1200;
  let nextLogId = 1;

  const stops = STOPS.map((stop) => {
    const count = 1 + Math.round(stop.baseRate * 3 + Math.random() * 2.5);
    const waiting = Array.from({ length: count }, () =>
      createPassenger(nextPassengerId++, Math.random() * 9.2),
    );
    return {
      ...stop,
      waiting,
      arrivalAccumulator: Math.random() * 0.6,
    };
  });

  const buses = INITIAL_BUSES.map((bus, index) => {
    const node = NODE_MAP[bus.from];
    const nextNode = NODE_MAP[bus.to];
    const distance = Math.hypot(nextNode.x - node.x, nextNode.y - node.y);
    return {
      ...bus,
      color: BUS_COLORS[index],
      capacity: BUS_CAPACITY,
      hopDuration: 2.05 + distance / 285,
      lastVisited: bus.from,
    };
  });

  const servedTotal = 1842;
  const avgWait = averageWait(stops);
  const metricsHistory = Array.from({ length: 18 }, (_, index) => {
    const age = 17 - index;
    const wobble = Math.sin(index * 0.72) * 0.55 + Math.cos(index * 0.31) * 0.25;
    return {
      t: simMinutes - age,
      wait:
        index === 17
          ? avgWait
          : clamp(avgWait + (age / 17) * 1.1 + wobble, 0.2, 18),
      served: servedTotal - age * 5.4,
      utilization: 62.5,
    };
  });

  const logs = SEED_LOGS.map((seed) => ({
    id: nextLogId++,
    time: simMinutes - seed.ago,
    tag: seed.tag,
    level: seed.level,
    message: seed.message,
    detail: seed.detail,
  }));

  return {
    running,
    speed: 1,
    scenario: 'normal',
    simMinutes,
    selectedStop: null,
    stops,
    buses,
    servedTotal,
    logs,
    nextLogId,
    nextPassengerId,
    metricsHistory,
    lastHistoryAt: simMinutes,
    optimizationCooldown: 4.2,
    optimizerPasses: 128,
    notice: null,
  };
}

function tick(state, realMs) {
  const deltaMinutes =
    (realMs / 1000) * SIM_MINUTES_PER_SECOND * state.speed;
  if (deltaMinutes <= 0) return state;

  const now = state.simMinutes + deltaMinutes;
  const scenario = SCENARIOS[state.scenario] ?? SCENARIOS.normal;
  let nextPassengerId = state.nextPassengerId;
  let nextLogId = state.nextLogId;
  let servedTotal = state.servedTotal;
  const newLogs = [];

  const pushLog = (tag, level, message, detail) => {
    newLogs.push({ id: nextLogId++, time: now, tag, level, message, detail });
  };

  // 1. Age existing requests and generate stochastic arrivals.
  const stops = state.stops.map((stop) => ({
    ...stop,
    waiting: stop.waiting.map((passenger) => ({
      ...passenger,
      wait: passenger.wait + deltaMinutes,
    })),
  }));

  stops.forEach((stop) => {
    const weight = scenario.stopWeights?.[stop.id] ?? 1;
    const rate =
      stop.baseRate * timeOfDayFactor(now) * scenario.arrivalMult * weight;
    const jitter = 0.62 + Math.random() * 0.76;
    let accumulator = stop.arrivalAccumulator + rate * deltaMinutes * jitter;
    let spawn = Math.floor(accumulator);
    accumulator -= spawn;

    if (stop.waiting.length + spawn > MAX_WAITING) {
      spawn = Math.max(0, MAX_WAITING - stop.waiting.length);
      accumulator = Math.min(accumulator, 0.9);
    }

    for (let index = 0; index < spawn; index += 1) {
      stop.waiting.push(createPassenger(nextPassengerId++, 0));
    }
    stop.arrivalAccumulator = accumulator;
  });

  const stopIndex = new Map(stops.map((stop, index) => [stop.id, index]));

  // 2. Move units, exchange riders and re-plan routes at every stop.
  const buses = state.buses.map((bus) => ({ ...bus }));

  for (let index = 0; index < buses.length; index += 1) {
    const bus = buses[index];
    if (bus.status !== 'active') continue;

    const fromNode = NODE_MAP[bus.from];
    const toNode = NODE_MAP[bus.to];
    if (!fromNode || !toNode) continue;

    const duration = bus.hopDuration ?? 3;
    let progress = bus.progress + deltaMinutes / duration;

    if (progress < 1) {
      bus.progress = progress;
      continue;
    }

    const atIndex = stopIndex.get(bus.to);
    if (atIndex === undefined) continue;
    const at = stops[atIndex];

    const delivered = bus.onboard ?? 0;
    servedTotal += delivered;

    // Oldest requests board first, up to the vehicle capacity.
    const boardCount = Math.min(bus.capacity, at.waiting.length);
    if (boardCount > 0) {
      const boardingIds = new Set(
        [...at.waiting]
          .sort((a, b) => b.wait - a.wait)
          .slice(0, boardCount)
          .map((passenger) => passenger.id),
      );
      at.waiting = at.waiting.filter(
        (passenger) => !boardingIds.has(passenger.id),
      );
    }

    bus.trips += 1;
    bus.progress = 0;
    bus.from = bus.to;
    bus.onboard = boardCount;
    bus.lastVisited = at.id;

    const exchange = delivered + boardCount;
    if (exchange >= 8 && bus.trips % 2 === 0) {
      pushLog(
        'DÉPLOIEMENT',
        at.waiting.length > 10 ? 'warning' : 'success',
        `${bus.id} a échangé des voyageurs à ${at.name} — ${delivered} descendus, ${boardCount} montés.`,
        `${at.waiting.length} encore en file · charge ${Math.round((boardCount / bus.capacity) * 100)} %`,
      );
    }

    let target = bus.target;
    if (!target || target === at.id || !NODE_MAP[target]) {
      target = chooseBusTarget({
        bus,
        stops,
        buses,
        scenarioId: state.scenario,
        simMinutes: now,
      });
    }

    let next = nextHopToward(at.id, target);
    if (!next || next === at.id) {
      target = chooseBusTarget({
        bus: { ...bus, to: at.id },
        stops,
        buses,
        scenarioId: state.scenario,
        simMinutes: now,
      });
      next = nextHopToward(at.id, target);
    }
    if (next === at.id) {
      next = Object.values(NODE_MAP).find(
        (stop) => stop.id !== at.id && hopDistance(at.id, stop.id) > 0,
      )?.id;
    }

    if (next) {
      bus.target = target;
      bus.to = next;
      bus.from = at.id;
      bus.hopDuration =
        2.05 +
        Math.hypot(
          NODE_MAP[next].x - NODE_MAP[at.id].x,
          NODE_MAP[next].y - NODE_MAP[at.id].y,
        ) /
          285;
    }

    buses[index] = bus;
  }

  // 3. Periodic fleet-level optimizer pass.
  let optimizationCooldown = state.optimizationCooldown - deltaMinutes;
  let optimizerPasses = state.optimizerPasses;

  if (optimizationCooldown <= 0) {
    const forecast = buildForecast({
      simMinutes: now,
      scenarioId: state.scenario,
      stops,
    });
    const hotspot = forecast.hotspots[0];
    const activeBuses = buses.filter((bus) => bus.status === 'active');
    const hotspotBus =
      hotspot && activeBuses.length
        ? selectBestBus(hotspot, activeBuses, {
            ...state,
            stops,
            buses,
            simMinutes: now,
          })
        : null;

    if (
      hotspot &&
      hotspotBus &&
      (hotspot.waiting >= 3 || hotspot.predicted >= 24)
    ) {
      const busIndex = buses.findIndex((bus) => bus.id === hotspotBus.id);
      const bus = buses[busIndex];
      const previousTarget = bus.target ? NODE_MAP[bus.target]?.name : 'patrouille';
      const hops = hopDistance(bus.to, hotspot.id);
      buses[busIndex] = { ...bus, target: hotspot.id };
      optimizerPasses += 1;
      pushLog(
        'OPTIMISEUR',
        hotspot.waiting >= 14 ? 'warning' : 'info',
        `Optimisation du réseau : ${bus.id} redirigé de ${previousTarget} vers ${hotspot.name} après une hausse prévue de +${Math.max(hotspot.lift, 8)} % de la demande.`,
        `${hotspot.waiting} en attente · ${hops} arrêts · ETA ${(hops * 2.4).toFixed(1)} min · passe #${optimizerPasses} · réseau neuronal`,
      );
      optimizationCooldown = 6.5 + Math.random() * 5.5;
    } else {
      optimizerPasses += 1;
      if (Math.random() < 0.55) {
        pushLog(
          'OPTIMISEUR',
          'info',
          'Passe d’optimisation terminée — la couverture de flotte est dans les cibles.',
          `Aucune redirection · réserve ${buses.filter((bus) => bus.status === 'depot').length} unités · passe #${optimizerPasses}`,
        );
      }
      optimizationCooldown = 5 + Math.random() * 4;
    }
  }

  const avgWait = averageWait(stops);
  const activeFleet = buses.filter((bus) => bus.status === 'active').length;
  const utilization = (activeFleet / TOTAL_FLEET) * 100;
  let metricsHistory = state.metricsHistory;
  let lastHistoryAt = state.lastHistoryAt;

  if (now - lastHistoryAt >= 1) {
    metricsHistory = [
      ...metricsHistory,
      {
        t: now,
        wait: avgWait,
        served: servedTotal,
        utilization,
      },
    ].slice(-28);
    lastHistoryAt = now;
  }

  const logs = [...newLogs.reverse(), ...state.logs].slice(0, MAX_LOGS);

  return {
    ...state,
    simMinutes: now,
    stops,
    buses,
    servedTotal,
    nextPassengerId,
    nextLogId,
    logs,
    metricsHistory,
    lastHistoryAt,
    optimizationCooldown,
    optimizerPasses,
  };
}

export function selectMetrics(state) {
  const waiting = state.stops.flatMap((stop) => stop.waiting);
  const activeBuses = state.buses.filter((bus) => bus.status === 'active');
  const parkedBuses = state.buses.filter((bus) => bus.status === 'depot');
  const avgWait = waiting.length
    ? average(waiting.map((passenger) => passenger.wait))
    : 0;
  const history = state.metricsHistory;
  const comparison = history[Math.max(0, history.length - 6)] ?? history[0];
  const waitTrend = comparison ? avgWait - comparison.wait : 0;
  const servedDelta = comparison ? state.servedTotal - comparison.served : 0;
  const activeCapacity = activeBuses.reduce(
    (sum, bus) => sum + (bus.capacity ?? BUS_CAPACITY),
    0,
  );
  const onboard = activeBuses.reduce((sum, bus) => sum + (bus.onboard ?? 0), 0);
  const longestWait = waiting.reduce(
    (max, passenger) => Math.max(max, passenger.wait),
    0,
  );

  return {
    avgWait,
    waitTrend,
    activeFleet: activeBuses.length,
    parkedFleet: parkedBuses.length,
    totalFleet: state.buses.length,
    utilization: Math.round((activeBuses.length / state.buses.length) * 100),
    occupancy: activeCapacity ? Math.round((onboard / activeCapacity) * 100) : 0,
    servedTotal: state.servedTotal,
    servedDelta,
    waitingTotal: waiting.length,
    onboardTotal: onboard,
    longestWait,
    history,
    criticalStops: state.stops.filter((stop) =>
      stop.waiting.some((passenger) => passenger.wait >= 12),
    ).length,
  };
}

function burstForScenario(scenarioId) {
  if (scenarioId === 'rush') {
    return {
      'casa-port': 8,
      'casa-voyageurs': 7,
      maarif: 6,
      'ain-sebaa': 4,
      anfa: 3,
    };
  }
  if (scenarioId === 'stadium') {
    return {
      maarif: 18,
      'casa-voyageurs': 6,
      'casa-port': 4,
      habous: 3,
    };
  }
  return {};
}

export function simReducer(state, action) {
  switch (action.type) {
    case 'TICK':
      return state.running ? tick(state, action.realMs) : state;

    case 'TOGGLE_RUNNING': {
      const running = !state.running;
      const next = {
        ...state,
        running,
        notice: notice(
          running ? 'Simulation reprise — optimiseur actif.' : 'Simulation en pause.',
          running ? 'success' : 'info',
        ),
      };
      return withLog(
        next,
        'SYSTÈME',
        'info',
        running
          ? 'Simulation reprise. Positions de flotte et files de demande dégelées.'
          : 'Simulation mise en pause par l’opérateur. Flotte maintenue.',
        running
          ? 'Horloge relancée · optimiseur auto en ligne'
          : 'Files figées · télémétrie toujours active',
      );
    }

    case 'SET_SPEED': {
      if (![1, 2, 5].includes(action.speed)) return state;
      return { ...state, speed: action.speed };
    }

    case 'SET_SCENARIO': {
      const scenario = SCENARIOS[action.scenario];
      if (!scenario || state.scenario === action.scenario) return state;
      let nextPassengerId = state.nextPassengerId;
      const bursts = burstForScenario(action.scenario);
      let injected = 0;

      const stops = state.stops.map((stop) => {
        const count = bursts[stop.id] ?? 0;
        if (!count) return stop;
        injected += count;
        const newWaiters = Array.from({ length: count }, () =>
          createPassenger(nextPassengerId++, Math.random() * 1.2),
        );
        return {
          ...stop,
          waiting: [...stop.waiting, ...newWaiters].slice(0, MAX_WAITING),
        };
      });

      const next = {
        ...state,
        scenario: action.scenario,
        stops,
        nextPassengerId,
        optimizationCooldown: Math.min(state.optimizationCooldown, 1),
        notice: notice(
          `Scénario activé : ${scenario.label}${injected ? ` · ${injected} demandes injectées` : ''}.`,
          'info',
        ),
      };
      return withLog(
        next,
        'SCÉNARIO',
        action.scenario === 'normal' ? 'info' : 'warning',
        `Profil de demande : ${scenario.label}. Modèle de prévision rééquilibré${injected ? ` et ${injected} demandes injectées` : ''}.`,
        `${scenario.description} · multiplicateur ${scenario.arrivalMult.toFixed(2)}× · rééquilibrage de l’optimiseur`,
      );
    }

    case 'DISPATCH_MANUAL': {
      const parked = state.buses.find((bus) => bus.status === 'depot');
      if (!parked) {
        return {
          ...withLog(
            state,
            'ALERTE',
            'warning',
            'Déploiement manuel refusé — les 8 unités sont déjà actives.',
            'Retournez une unité au dépôt avant tout nouveau déploiement.',
          ),
          notice: notice('Les 8 unités sont déjà déployées.', 'warning'),
        };
      }

      const targetStop =
        (action.stopId && state.stops.find((stop) => stop.id === action.stopId)) ||
        busiestStop(state.stops);
      const target = targetStop?.id ?? 'casa-voyageurs';
      const from = target === 'casa-voyageurs' ? 'maarif' : 'casa-voyageurs';
      const to = nextHopToward(from, target) || target;
      const busIndex = state.buses.findIndex((bus) => bus.id === parked.id);
      const deployed = {
        ...parked,
        status: 'active',
        from,
        to,
        progress: 0.08,
        target,
        onboard: 0,
        trips: 0,
        deployedAt: state.simMinutes,
      };
      const buses = state.buses.map((bus, index) =>
        index === busIndex ? deployed : bus,
      );
      const remaining = buses.filter((bus) => bus.status === 'depot').length;
      const next = {
        ...state,
        buses,
        optimizationCooldown: Math.min(state.optimizationCooldown, 1.5),
        notice: notice(
          `${deployed.id} déployé vers ${targetStop?.name ?? 'Casa Voyageurs'}.`,
          'success',
        ),
      };
      return withLog(
        next,
        'DÉPLOIEMENT',
        'success',
        `Déploiement manuel : ${deployed.id} envoyé vers ${targetStop?.name ?? 'Casa Voyageurs'}.`,
        `${targetStop?.waiting.length ?? 0} en attente · ${remaining} unité${remaining === 1 ? '' : 's'} en réserve`,
      );
    }

    case 'PRIORITIZE_STOP': {
      const stop = state.stops.find((entry) => entry.id === action.stopId);
      if (!stop) return state;

      const candidates = state.buses.filter(
        (bus) => bus.status === 'active' && bus.target !== stop.id,
      );

      const bus = selectBestBus(stop, candidates, {
        ...state,
        stops: state.stops,
      });

      if (!bus) {
        return {
          ...withLog(
            state,
            'ALERTE',
            'warning',
            `Demande prioritaire pour ${stop.name} — toutes les unités actives sont déjà affectées.`,
            'Le déploiement manuel est disponible depuis le poste de commande.',
          ),
          notice: notice(`Aucune unité disponible pour ${stop.name}.`, 'warning'),
        };
      }
      const buses = state.buses.map((entry) =>
        entry.id === bus.id ? { ...entry, target: stop.id } : entry,
      );
      const hops = hopDistance(bus.to, stop.id);
      const next = {
        ...state,
        buses,
        notice: notice(`${bus.id} redirigé vers ${stop.name}.`, 'success'),
      };
      return withLog(
        next,
        'OPTIMISEUR',
        'warning',
        `Dispatch prioritaire : ${bus.id} redirigé vers ${stop.name} — ${stop.waiting.length} voyageurs en attente.`,
        `Attente max ${stop.waiting.reduce((max, passenger) => Math.max(max, passenger.wait), 0).toFixed(1)} min · ETA ${(hops * 2.4).toFixed(1)} min · réseau neuronal`,
      );
    }

    case 'SELECT_STOP': {
      return {
        ...state,
        selectedStop:
          state.selectedStop === action.stopId ? null : action.stopId,
      };
    }

    case 'RESET': {
      const fresh = createInitialState({ running: false });
      const reset = {
        ...fresh,
        notice: notice('Simulation réinitialisée — réseau de base restauré.', 'info'),
      };
      return withLog(
        reset,
        'SYSTÈME',
        'info',
        'Simulation réinitialisée par l’opérateur. Flotte au déploiement de base.',
        '5 actives · 3 en réserve · profil Trafic normal restauré',
      );
    }

    default:
      return state;
  }
}
