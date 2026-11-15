import {
  BrainCircuit,
  BusFront,
  Clock3,
  Map,
  MapPin,
  Navigation,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  CITY_BLOCKS,
  DISTRICT_LABELS,
  EDGES,
  SCENARIOS,
  STOPS,
  hopDistance,
  pathBetween,
} from '../data/network.js';
import { clamp, formatClock, waitTone } from '../lib/format.js';
import { estimateStopPressure } from '../lib/forecast.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';

/**
 * A portrait layout for phones. The topology is identical, so every route,
 * target and simulation calculation still uses the canonical graph.
 */
const MOBILE_POSITIONS = {
  university: { x: 56, y: 164 },
  north: { x: 150, y: 52 },
  stadium: { x: 288, y: 70 },
  tech: { x: 352, y: 198 },
  central: { x: 210, y: 300 },
  mall: { x: 70, y: 348 },
  riverside: { x: 56, y: 505 },
  medical: { x: 181, y: 516 },
  industrial: { x: 302, y: 434 },
  airport: { x: 355, y: 554 },
};

function busPosition(bus, nodes) {
  const from = nodes[bus.from];
  const to = nodes[bus.to];
  if (!from || !to) return { x: 500, y: 290, angle: 0 };
  const progress = clamp(bus.progress ?? 0, 0, 1);
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    angle,
  };
}

function QueueDots({ waiting, radius }) {
  const visible = waiting.slice(0, 10);
  return visible.map((passenger, index) => {
    const tone = waitTone(passenger.wait);
    const angle = (index / Math.max(visible.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const ring = radius + (visible.length > 6 ? (index % 2) * 3 : 0);
    return (
      <circle
        key={passenger.id}
        cx={Math.cos(angle) * ring}
        cy={Math.sin(angle) * ring}
        r={passenger.wait >= 12 ? 3.25 : 2.75}
        fill={tone.color}
        stroke="#071014"
        strokeWidth="1.1"
        opacity={passenger.wait >= 12 ? 1 : 0.86}
        className={passenger.wait >= 12 ? 'live-pulse' : undefined}
      />
    );
  });
}

function StopNode({ stop, selected, critical, onSelect, isMobile }) {
  const waiting = stop.waiting;
  const averageWait = waiting.length
    ? waiting.reduce((sum, passenger) => sum + passenger.wait, 0) / waiting.length
    : 0;
  const tone = waitTone(averageWait);
  const count = waiting.length;
  const countWidth = count > 9 ? 26 : 20;
  const isHub = stop.id === 'central';

  return (
    <g
      transform={`translate(${stop.x} ${stop.y})`}
      className="map-node"
      role="button"
      tabIndex={0}
      focusable="true"
      aria-label={`${stop.name}: ${count} waiting, average wait ${
        count
          ? (
              waiting.reduce((sum, passenger) => sum + passenger.wait, 0) / count
            ).toFixed(1)
          : '0'
      } minutes`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(stop.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(stop.id);
        }
      }}
    >
      {(critical || selected) && (
        <circle
          r={stop.radius + 13}
          fill="none"
          stroke={selected ? '#22d3ee' : tone.color}
          strokeWidth={selected ? 1.3 : 1}
          strokeDasharray={selected ? '3 5' : undefined}
          opacity={selected ? 0.9 : 0.38}
          className={critical && !selected ? 'live-pulse' : undefined}
        />
      )}
      <circle
        r={stop.radius + 12}
        fill={tone.soft}
        opacity={critical ? 0.9 : 0.45}
      />
      <circle
        className="node-halo"
        r={stop.radius + 5}
        fill="none"
        stroke={tone.color}
        strokeWidth="1"
        opacity={selected ? 0.7 : 0.2}
      />
      <circle
        className="node-shell"
        r={stop.radius}
        fill="#0a1318"
        stroke={selected ? '#22d3ee' : critical ? tone.color : '#31434c'}
        strokeWidth={selected ? 2.2 : 1.4}
      />
      <circle
        className="node-focus"
        r={stop.radius + 2.5}
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1"
        opacity="0"
      />
      <circle
        r={isHub ? 7.5 : 6}
        fill="none"
        stroke={tone.color}
        strokeOpacity="0.12"
        strokeWidth="5"
      />
      <text
        textAnchor="middle"
        y="3.1"
        fontSize={isHub ? (isMobile ? 9.8 : 8.9) : isMobile ? 9.1 : 8.2}
        fontWeight="600"
        fill={selected ? '#a5f3fc' : critical ? '#fecdd3' : '#dce7e9'}
        fontFamily="'JetBrains Mono Variable', monospace"
        letterSpacing="0.05em"
        style={{ pointerEvents: 'none' }}
      >
        {stop.code}
      </text>

      <QueueDots waiting={waiting} radius={stop.radius + 12} />

      {count > 0 && (
        <g transform={`translate(${stop.radius + 4} ${-stop.radius - 8})`}>
          <rect
            x="0"
            y="-7"
            width={countWidth}
            height="14"
            rx="7"
            fill="#071014"
            stroke={tone.color}
            strokeOpacity="0.42"
            strokeWidth="0.8"
          />
          <text
            x={countWidth / 2}
            y="2.8"
            textAnchor="middle"
            fontSize={isMobile ? 8.9 : 8.1}
            fontWeight="650"
            fill={tone.color}
            fontFamily="'JetBrains Mono Variable', monospace"
          >
            {count}
          </text>
        </g>
      )}

      <text
        textAnchor="middle"
        y={stop.radius + 26}
        fontSize={isMobile ? 11.2 : 10.1}
        fontWeight="500"
        fill={selected ? '#67e8f9' : '#94a3b8'}
        letterSpacing="0.01em"
        style={{ pointerEvents: 'none' }}
      >
        {stop.name}
      </text>
    </g>
  );
}

function ActiveBus({ bus, nodes }) {
  const { x, y, angle } = busPosition(bus, nodes);
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ transition: 'transform 160ms linear' }}
      pointerEvents="none"
    >
      <circle r="19" fill={bus.color} opacity="0.085" />
      <circle r="11" fill="none" stroke={bus.color} strokeWidth="0.7" opacity="0.3" />
      <g transform={`rotate(${angle})`}>
        <rect
          x="-12"
          y="-7.4"
          width="24"
          height="14.8"
          rx="4.2"
          fill={bus.color}
          stroke="#04100d"
          strokeWidth="0.9"
        />
        <rect
          x="-8.1"
          y="-4.6"
          width="6.2"
          height="4.9"
          rx="1"
          fill="#071418"
          opacity="0.8"
        />
        <rect
          x="0.6"
          y="-4.6"
          width="6.2"
          height="4.9"
          rx="1"
          fill="#071418"
          opacity="0.8"
        />
        <rect x="-7.7" y="2.9" width="4" height="1.5" rx="0.5" fill="#071418" opacity="0.55" />
        <circle cx="-6.8" cy="7.5" r="1.8" fill="#050a0c" stroke={bus.color} strokeWidth="0.55" />
        <circle cx="6.8" cy="7.5" r="1.8" fill="#050a0c" stroke={bus.color} strokeWidth="0.55" />
      </g>
      <g transform="translate(0 -18.5)">
        <rect x="-18" y="-6.2" width="36" height="12.4" rx="4.4" fill="#071014" stroke={bus.color} strokeOpacity="0.4" strokeWidth="0.75" />
        <text
          textAnchor="middle"
          y="2.5"
          fontSize="7.6"
          fontWeight="600"
          fill={bus.color}
          fontFamily="'JetBrains Mono Variable', monospace"
          letterSpacing="0.04em"
        >
          {bus.id}
        </text>
      </g>
    </g>
  );
}

function StopInspector({
  stop,
  state,
  activeBuses,
  onClose,
  onPrioritize,
  isMobile,
}) {
  if (!stop) return null;
  const waiting = stop.waiting;
  const avgWait = waiting.length
    ? waiting.reduce((sum, passenger) => sum + passenger.wait, 0) / waiting.length
    : 0;
  const tone = waitTone(avgWait);
  const predicted = Math.round(
    estimateStopPressure({
      stop,
      simMinutes: state.simMinutes,
      scenarioId: state.scenario,
    }) / 2,
  );
  const assigned = activeBuses.filter((bus) => bus.target === stop.id);
  const nearest = [...activeBuses]
    .sort((a, b) => {
      const aScore =
        hopDistance(a.to, stop.id) + (1 - (a.progress ?? 0)) - (a.target === stop.id ? 0.9 : 0);
      const bScore =
        hopDistance(b.to, stop.id) + (1 - (b.progress ?? 0)) - (b.target === stop.id ? 0.9 : 0);
      return aScore - bScore;
    })[0];
  const eta = nearest
    ? (hopDistance(nearest.to, stop.id) + 1 - (nearest.progress ?? 0)) * 2.15
    : null;
  const scene = SCENARIOS[state.scenario] ?? SCENARIOS.normal;
  const onRight = stop.x > 500;
  const low = stop.y > 285;
  const desktopPosition = `${low ? 'sm:top-4 sm:bottom-auto' : 'sm:bottom-4 sm:top-auto'} ${
    onRight ? 'sm:left-4 sm:right-auto' : 'sm:right-4 sm:left-auto'
  }`;

  return (
    <div
      className={`log-entry absolute inset-x-3 bottom-3 z-20 w-auto rounded-xl border border-cyan-300/15 bg-[#071014]/95 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,.95),0_0_30px_-18px_rgba(34,211,238,.5)] backdrop-blur-xl sm:w-[244px] ${
        isMobile ? '' : desktopPosition
      }`}
      role="dialog"
      aria-label={`${stop.name} stop details`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.9} />
          </span>
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-cyan-300/65">
              Stop inspector
            </p>
            <h3 className="mt-0.5 text-[13px] font-medium leading-tight text-zinc-100">
              {stop.name}
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          aria-label="Close stop inspector"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-600">
          {stop.zone}
        </span>
        <span
          className="rounded border px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.08em]"
          style={{
            color: tone.color,
            borderColor: `${tone.color}30`,
            background: `${tone.color}0d`,
          }}
        >
          {tone.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-white/[0.055] bg-white/[0.025] px-2 py-1.5">
          <span className="flex items-center gap-1 font-mono text-[7px] uppercase tracking-[0.06em] text-zinc-600">
            <Users className="h-2.5 w-2.5" /> Queue
          </span>
          <p className="mono-num mt-1 text-[14px] font-medium leading-none text-zinc-100">
            {waiting.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.055] bg-white/[0.025] px-2 py-1.5">
          <span className="flex items-center gap-1 font-mono text-[7px] uppercase tracking-[0.06em] text-zinc-600">
            <Clock3 className="h-2.5 w-2.5" /> Avg
          </span>
          <p className="mono-num mt-1 text-[14px] font-medium leading-none text-zinc-100">
            {avgWait.toFixed(1)}
            <span className="ml-0.5 text-[8px] font-normal text-zinc-500">m</span>
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.055] bg-white/[0.025] px-2 py-1.5">
          <span className="flex items-center gap-1 font-mono text-[7px] uppercase tracking-[0.06em] text-zinc-600">
            <Navigation className="h-2.5 w-2.5" /> ETA
          </span>
          <p className="mono-num mt-1 text-[14px] font-medium leading-none text-zinc-100">
            {eta != null ? eta.toFixed(1) : '—'}
            <span className="ml-0.5 text-[8px] font-normal text-zinc-500">m</span>
          </p>
        </div>
      </div>

      <div className="mt-2.5 rounded-lg border border-white/[0.055] bg-white/[0.02] px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-[0.09em] text-zinc-500">
            <Sparkles className="h-2.5 w-2.5 text-cyan-300/70" /> Forecast +15m
          </span>
          <span className="font-mono text-[9px] font-medium text-cyan-300">
            ~{predicted} riders
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${clamp((waiting.length / 18) * 100, 4, 100)}%`,
              background: `linear-gradient(90deg, ${tone.color}aa, ${tone.color})`,
              boxShadow: `0 0 8px ${tone.color}70`,
            }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[7px] uppercase tracking-[0.06em] text-zinc-600">
          <span>{assigned.length} unit{assigned.length === 1 ? '' : 's'} assigned</span>
          <span>{scene.label}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPrioritize(stop.id)}
        className="focus-ring mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-400/[0.09] text-[10px] font-medium text-cyan-200 transition-all hover:border-cyan-300/40 hover:bg-cyan-400/[0.15]"
      >
        <Zap className="h-3 w-3" strokeWidth={2} />
        Prioritize pickup
      </button>
    </div>
  );
}

export default function TransitMap({
  state,
  activeBuses,
  metrics,
  onSelectStop,
  onPrioritize,
  onDispatchSelected,
}) {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const coordinateMap = isMobile
    ? MOBILE_POSITIONS
    : Object.fromEntries(STOPS.map((stop) => [stop.id, { x: stop.x, y: stop.y }]));
  const visualNodes = Object.fromEntries(
    STOPS.map((stop) => [stop.id, { ...stop, ...coordinateMap[stop.id] }]),
  );
  const visualStops = state.stops.map((stop) => ({
    ...stop,
    ...coordinateMap[stop.id],
  }));
  const selectedStop =
    visualStops.find((stop) => stop.id === state.selectedStop) ?? null;
  const criticalStops = state.stops.filter((stop) =>
    stop.waiting.some((passenger) => passenger.wait >= 12),
  ).length;
  const center = isMobile ? { x: 210, y: 310 } : { x: 493, y: 278 };

  return (
    <section className="panel overflow-hidden xl:col-span-8" aria-label="Live transit map">
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/[0.06] px-3.5 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-emerald-300/80">
            <Map className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[12px] font-medium tracking-wide text-zinc-200">
                Live Network
              </h2>
              <span className="hidden font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-600 sm:inline">
                / dispatch layer
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-600">
              10 connected stops · {activeBuses.length} units moving · {metrics.waitingTotal} riders queued
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {criticalStops > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/15 bg-rose-400/[0.055] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-rose-300">
              <span className="h-1 w-1 rounded-full bg-rose-400 shadow-[0_0_5px_rgba(251,113,133,.8)]" />
              {criticalStops} critical
            </span>
          )}
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.045] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-emerald-300/90 sm:inline-flex">
            <span className="live-dot" />
            Auto optimizer
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-500">
            <span className="h-1 w-1 rounded-full bg-cyan-400/80" />
            {formatClock(state.simMinutes)} sim
          </span>
        </div>
      </div>

      <div
        className={`map-shell map-vignette relative w-full overflow-hidden ${
          isMobile ? 'aspect-[420/620]' : 'aspect-[1000/580]'
        }`}
        onClick={() => {
          if (state.selectedStop) onSelectStop(null);
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)]" />

        <svg
          viewBox={isMobile ? '0 0 420 620' : '0 0 1000 580'}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Interactive city transit network with 10 stops and active autonomous buses"
        >
          <defs>
            <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="#49606b" opacity="0.35" />
            </pattern>
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.07" />
              <stop offset="70%" stopColor="#34d399" stopOpacity="0.012" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="road-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1d2c33" />
              <stop offset="100%" stopColor="#18252c" />
            </linearGradient>
          </defs>

          <rect
            width={isMobile ? '420' : '1000'}
            height={isMobile ? '620' : '580'}
            fill="url(#dot-grid)"
            opacity="0.55"
          />
          <circle cx={center.x} cy={center.y} r={isMobile ? 164 : 238} fill="url(#center-glow)" />
          <circle cx={center.x} cy={center.y} r={isMobile ? 118 : 174} fill="none" stroke="#34d399" strokeOpacity="0.035" strokeWidth="1" />
          <circle cx={center.x} cy={center.y} r={isMobile ? 174 : 246} fill="none" stroke="#22d3ee" strokeOpacity="0.025" strokeWidth="1" strokeDasharray="2 8" />
          {!isMobile && (
            <circle cx={center.x} cy={center.y} r="322" fill="none" stroke="#34d399" strokeOpacity="0.02" strokeWidth="1" />
          )}

          {!isMobile && (
            <>
              <g opacity="0.72">
                {CITY_BLOCKS.map((block, index) => (
                  <rect
                    key={`${block.x}-${block.y}`}
                    x={block.x}
                    y={block.y}
                    width={block.w}
                    height={block.h}
                    rx={block.rx}
                    fill="#0a1217"
                    stroke="#18252c"
                    strokeWidth="0.8"
                    opacity={0.52 + (index % 3) * 0.08}
                  />
                ))}
              </g>

              {DISTRICT_LABELS.map((district) => (
                <text
                  key={district.label}
                  x={district.x}
                  y={district.y}
                  fontSize="7"
                  fontWeight="600"
                  letterSpacing="0.2em"
                  fill="#53636d"
                  opacity="0.44"
                  fontFamily="'JetBrains Mono Variable', monospace"
                >
                  {district.label}
                </text>
              ))}
            </>
          )}

          <g>
            {EDGES.map(([a, b]) => {
              const from = visualNodes[a];
              const to = visualNodes[b];
              return (
                <g key={`${a}-${b}`}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#060b0e" strokeWidth="13" strokeLinecap="round" opacity="0.72" />
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="url(#road-gradient)" strokeWidth="9" strokeLinecap="round" />
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#52656f" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="1 9" opacity="0.34" />
                </g>
              );
            })}
          </g>

          {activeBuses.map((bus) => {
            const targetPath = pathBetween(bus.to, bus.target);
            if (targetPath.length < 2) return null;
            const { x, y } = busPosition(bus, visualNodes);
            const points = [
              `${x},${y}`,
              ...targetPath.map((id) => `${visualNodes[id].x},${visualNodes[id].y}`),
            ].join(' ');
            return (
              <polyline
                key={`route-${bus.id}`}
                points={points}
                fill="none"
                stroke={bus.color}
                strokeWidth="1.25"
                strokeOpacity="0.36"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="route-flow"
              />
            );
          })}

          {activeBuses.map((bus) => (
            <ActiveBus key={bus.id} bus={bus} nodes={visualNodes} />
          ))}

          {visualStops.map((stop) => {
            const critical = stop.waiting.some(
              (passenger) => passenger.wait >= 12,
            );
            return (
              <StopNode
                key={stop.id}
                stop={stop}
                critical={critical}
                selected={state.selectedStop === stop.id}
                onSelect={onSelectStop}
                isMobile={isMobile}
              />
            );
          })}
        </svg>

        <StopInspector
          key={selectedStop?.id}
          stop={selectedStop}
          state={state}
          activeBuses={activeBuses}
          isMobile={isMobile}
          onClose={() => onSelectStop(null)}
          onPrioritize={(stopId) => {
            onPrioritize(stopId);
            onSelectStop(null);
          }}
        />

        {!selectedStop && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-white/[0.055] bg-[#071014]/70 px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.1em] text-zinc-600 backdrop-blur-sm sm:left-4 sm:top-4">
            <Navigation className="h-2.5 w-2.5 text-cyan-300/60" />
            {isMobile ? 'Tap a stop to inspect' : 'Click a stop to inspect'}
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-md border border-white/[0.055] bg-[#071014]/70 px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.09em] text-zinc-600 backdrop-blur-sm sm:flex">
          <BrainCircuit className="h-2.5 w-2.5 text-emerald-300/60" />
          MPC horizon 20m
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-3.5 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[7.5px] uppercase tracking-[0.08em] text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> &lt; 6m wait
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" /> 6–12m
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> 12m+
          </span>
          <span className="flex items-center gap-1.5">
            <BusFront className="h-2.5 w-2.5 text-cyan-300/70" /> active unit
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[7.5px] uppercase tracking-[0.08em] text-zinc-600">
          <span>
            reserve <span className="text-zinc-400">{metrics.parkedFleet}</span>
          </span>
          <span className="h-3 w-px bg-white/[0.07]" />
          <span>
            onboard <span className="text-cyan-300/80">{metrics.onboardTotal}</span>
          </span>
          <button
            type="button"
            onClick={() => onDispatchSelected(state.selectedStop)}
            disabled={metrics.parkedFleet === 0}
            className="focus-ring hidden items-center gap-1 rounded border border-cyan-400/15 bg-cyan-400/[0.045] px-1.5 py-0.5 text-cyan-300/80 transition-colors hover:border-cyan-300/30 hover:bg-cyan-400/[0.1] disabled:border-white/[0.05] disabled:text-zinc-700 sm:inline-flex"
            title="Dispatch a reserve unit"
          >
            <Zap className="h-2.5 w-2.5" />
            Add unit
          </button>
        </div>
      </div>
    </section>
  );
}
