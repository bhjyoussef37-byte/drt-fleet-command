import {
  NODE_MAP,
  SCENARIOS,
  STOPS,
  hopDistance,
  nextHopToward,
  timeOfDayFactor,
} from '../data/network.js';
import { buildForecast } from '../lib/forecast.js';
import { average, clamp } from '../lib/format.js';

export const TOTAL_FLEET = 8;
export const SIM_MINUTES_PER_SECOND = 0.3;
export const TICK_INTERVAL_MS = 125;
export const MAX_WAITING = 60;
const MAX_LOGS = 80;
const BUS_CAPACITY = 16;
const START_MINUTE = 16 * 60 + 18;

const BUS_COLORS = [
  '#34d399',
  '#22d3ee',
  '#2dd4bf',
  '#38bdf8',
  '#a3e635',
  '#fbbf24',
  '#fb7185',
  '#c084fc',
];

const INITIAL_BUSES = [
  {
    id: 'NX-01',
    from: 'university',
    to: 'central',
    progress: 0.42,
    target: 'medical',
    onboard: 3,
    trips: 6,
    status: 'active',
  },
  {
    id: 'NX-02',
    from: 'north',
    to: 'stadium',
    progress: 0.66,
    target: 'stadium',
    onboard: 2,
    trips: 9,
    status: 'active',
  },
  {
    id: 'NX-03',
    from: 'tech',
    to: 'central',
    progress: 0.3,
    target: 'mall',
    onboard: 0,
    trips: 4,
    status: 'active',
  },
  {
    id: 'NX-04',
    from: 'mall',
    to: 'riverside',
    progress: 0.55,
    target: 'riverside',
    onboard: 4,
    trips: 7,
    status: 'active',
  },
  {
    id: 'NX-05',
    from: 'industrial',
    to: 'airport',
    progress: 0.22,
    target: 'airport',
    onboard: 1,
    trips: 5,
    status: 'active',
  },
  {
    id: 'NX-06',
    from: 'central',
    to: 'university',
    progress: 0,
    target: null,
    onboard: 0,
    trips: 0,
    status: 'depot',
  },
  {
    id: 'NX-07',
    from: 'central',
    to: 'medical',
    progress: 0,
    target: null,
    onboard: 0,
    trips: 0,
    status: 'depot',
  },
  {
    id: 'NX-08',
    from: 'central',
    to: 'industrial',
    progress: 0,
    target: null,
    onboard: 0,
    trips: 0,
    status: 'depot',
  },
];

const SEED_LOGS = [
  {
    tag: 'NETWORK',
    level: 'success',
    message: 'Transit mesh synchronized. 10 / 10 stations reporting live demand.',
    detail: 'Sensor mesh v4.2 · latency 12 ms',
    ago: 0.2,
  },
  {
    tag: 'FORECAST',
    level: 'info',
    message: 'PM commute curve detected. Model expects demand to climb through 17:30.',
    detail: 'Gradient-boosted forecaster · confidence 94.1%',
    ago: 1.2,
  },
  {
    tag: 'DISPATCH',
    level: 'success',
    message: 'NX-04 serving Mall → Riverside with 4 riders aboard.',
    detail: 'ETA 2.4 min · on schedule',
    ago: 2.4,
  },
  {
    tag: 'OPTIMIZER',
    level: 'info',
    message: 'Optimizer holding 3 units in depot reserve for demand spikes.',
    detail: 'Reserve 37.5% · rebalance horizon 20 min',
    ago: 3.7,
  },
  {
    tag: 'ALERT',
    level: 'warning',
    message: 'University queue approaching 9 min average wait.',
    detail: 'Auto-priority candidate · monitoring',
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

  return best?.id ?? 'central';
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
        'DISPATCH',
        at.waiting.length > 10 ? 'warning' : 'success',
        `${bus.id} exchanged riders at ${at.name} — ${delivered} alighted, ${boardCount} boarded.`,
        `${at.waiting.length} still queued · load ${Math.round((boardCount / bus.capacity) * 100)}%`,
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
    const candidates = hotspot
      ? activeBuses
          .filter((bus) => bus.target !== hotspot.id)
          .sort(
            (a, b) =>
              hopDistance(a.to, hotspot.id) - hopDistance(b.to, hotspot.id),
          )
      : [];

    if (
      hotspot &&
      candidates.length > 0 &&
      (hotspot.waiting >= 3 || hotspot.predicted >= 24)
    ) {
      const busIndex = buses.findIndex((bus) => bus.id === candidates[0].id);
      const bus = buses[busIndex];
      const previousTarget = bus.target ? NODE_MAP[bus.target]?.name : 'patrol';
      const hops = hopDistance(bus.to, hotspot.id);
      buses[busIndex] = { ...bus, target: hotspot.id };
      optimizerPasses += 1;
      pushLog(
        'OPTIMIZER',
        hotspot.waiting >= 14 ? 'warning' : 'info',
        `Optimizing fleet: ${bus.id} redirected from ${previousTarget} to ${hotspot.name} due to a predicted +${Math.max(hotspot.lift, 8)}% passenger surge.`,
        `${hotspot.waiting} waiting · ${hops} stops out · ETA ${(hops * 2.4).toFixed(1)} min · pass #${optimizerPasses}`,
      );
      optimizationCooldown = 6.5 + Math.random() * 5.5;
    } else {
      optimizerPasses += 1;
      if (Math.random() < 0.55) {
        pushLog(
          'OPTIMIZER',
          'info',
          'Optimizer pass complete — current fleet coverage is within target bounds.',
          `No reroute required · reserve ${buses.filter((bus) => bus.status === 'depot').length} units · pass #${optimizerPasses}`,
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
      central: 8,
      university: 6,
      tech: 5,
      north: 4,
      mall: 3,
    };
  }
  if (scenarioId === 'stadium') {
    return {
      stadium: 18,
      central: 6,
      mall: 4,
      tech: 3,
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
          running ? 'Simulation resumed — optimizer live.' : 'Simulation paused.',
          running ? 'success' : 'info',
        ),
      };
      return withLog(
        next,
        'SYSTEM',
        'info',
        running
          ? 'Simulation resumed. Fleet positions and demand queues unfrozen.'
          : 'Simulation paused by operator. Fleet holding positions.',
        running ? 'Clock restarted · auto-optimizer online' : 'Queues frozen · telemetry still streaming',
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
          `${scenario.label} activated${injected ? ` · ${injected} new requests injected` : ''}.`,
          'info',
        ),
      };
      return withLog(
        next,
        'SCENARIO',
        action.scenario === 'normal' ? 'info' : 'warning',
        `Demand profile switched to ${scenario.label}. Forecast model re-weighted${injected ? ` and ${injected} requests injected` : ''}.`,
        `${scenario.description} · arrival multiplier ${scenario.arrivalMult.toFixed(2)}× · optimizer rebalancing`,
      );
    }

    case 'DISPATCH_MANUAL': {
      const parked = state.buses.find((bus) => bus.status === 'depot');
      if (!parked) {
        return {
          ...withLog(
            state,
            'ALERT',
            'warning',
            'Manual dispatch rejected — all 8 fleet units are already active.',
            'Return a unit to depot before deploying another.',
          ),
          notice: notice('All 8 units are already deployed.', 'warning'),
        };
      }

      const targetStop =
        (action.stopId && state.stops.find((stop) => stop.id === action.stopId)) ||
        busiestStop(state.stops);
      const target = targetStop?.id ?? 'central';
      const from = target === 'central' ? 'university' : 'central';
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
          `${deployed.id} dispatched to ${targetStop?.name ?? 'Central Station'}.`,
          'success',
        ),
      };
      return withLog(
        next,
        'DISPATCH',
        'success',
        `Manual dispatch: ${deployed.id} rolled out to ${targetStop?.name ?? 'Central Station'}.`,
        `${targetStop?.waiting.length ?? 0} waiting now · ${remaining} unit${remaining === 1 ? '' : 's'} remaining in reserve`,
      );
    }

    case 'PRIORITIZE_STOP': {
      const stop = state.stops.find((entry) => entry.id === action.stopId);
      if (!stop) return state;

      const candidates = state.buses
        .filter((bus) => bus.status === 'active' && bus.target !== stop.id)
        .sort((a, b) => hopDistance(a.to, stop.id) - hopDistance(b.to, stop.id));

      if (!candidates.length) {
        return {
          ...withLog(
            state,
            'ALERT',
            'warning',
            `Priority request for ${stop.name} — every active unit is already assigned.`,
            'Manual reserve dispatch is available from the control deck.',
          ),
          notice: notice(`No unassigned units available for ${stop.name}.`, 'warning'),
        };
      }

      const bus = candidates[0];
      const buses = state.buses.map((entry) =>
        entry.id === bus.id ? { ...entry, target: stop.id } : entry,
      );
      const hops = hopDistance(bus.to, stop.id);
      const next = {
        ...state,
        buses,
        notice: notice(`${bus.id} rerouted to ${stop.name}.`, 'success'),
      };
      return withLog(
        next,
        'OPTIMIZER',
        'warning',
        `Priority dispatch: ${bus.id} rerouted to ${stop.name} — ${stop.waiting.length} passengers waiting.`,
        `Longest wait ${stop.waiting.reduce((max, passenger) => Math.max(max, passenger.wait), 0).toFixed(1)} min · ETA ${(hops * 2.4).toFixed(1)} min`,
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
        notice: notice('Simulation reset — baseline network restored.', 'info'),
      };
      return withLog(
        reset,
        'SYSTEM',
        'info',
        'Simulation reset by operator. Fleet returned to baseline deployment.',
        '5 active · 3 in depot · demand model restored to Normal profile',
      );
    }

    default:
      return state;
  }
}
