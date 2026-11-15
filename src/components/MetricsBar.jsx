import {
  ArrowDownRight,
  ArrowUpRight,
  BusFront,
  Clock3,
  Gauge,
  Minus,
  Users,
} from 'lucide-react';
import { formatNumber } from '../lib/format.js';

function Sparkline({ values, color, id }) {
  const width = 96;
  const height = 28;
  const safe = values.length > 1 ? values : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const points = safe.map((value, index) => {
    const x = (index / (safe.length - 1)) * width;
    const y = height - 3 - ((value - min) / range) * (height - 7);
    return [x, y];
  });
  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-[66px] overflow-visible opacity-80 transition-opacity duration-300 group-hover:opacity-100 sm:w-[96px]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r="2"
        fill={color}
        stroke="#0a1115"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function TrendPill({ value, lowerIsBetter = true, suffix = 'min' }) {
  const flat = Math.abs(value) < 0.05;
  const isGood = lowerIsBetter ? value < 0 : value > 0;
  const tone = flat
    ? 'border-white/[0.07] bg-white/[0.035] text-zinc-500'
    : isGood
      ? 'border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300'
      : 'border-rose-400/15 bg-rose-400/[0.06] text-rose-300';
  const Icon = flat ? Minus : isGood ? ArrowDownRight : ArrowUpRight;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-medium tabular-nums ${tone}`}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.1} />
      {flat ? 'stable' : `${Math.abs(value).toFixed(1)}${suffix ? ` ${suffix}` : ''}`}
    </span>
  );
}

function CardShell({ children, accent = 'yellow', className = '' }) {
  const glows = {
    yellow: 'bg-yellow-300/[0.1]',
    amber: 'bg-amber-400/[0.08]',
    orange: 'bg-orange-400/[0.075]',
    slate: 'bg-zinc-400/[0.06]',
  };
  return (
    <article
      className={`panel panel-interactive group relative overflow-hidden px-3 py-3 sm:px-3.5 ${className}`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-3xl ${glows[accent]}`}
      />
      <div className="relative z-10">{children}</div>
    </article>
  );
}

function MetricIcon({ icon: Icon, tone }) {
  const tones = {
    yellow:
      'border-yellow-300/20 bg-yellow-300/[0.075] text-yellow-200 shadow-[0_0_20px_-8px_rgba(255,212,0,.65)]',
    amber:
      'border-amber-300/20 bg-amber-300/[0.065] text-amber-200 shadow-[0_0_20px_-8px_rgba(252,211,77,.55)]',
    orange:
      'border-orange-400/20 bg-orange-400/[0.065] text-orange-200 shadow-[0_0_20px_-8px_rgba(251,146,60,.5)]',
    slate: 'border-white/10 bg-white/[0.04] text-zinc-400',
  };
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </div>
  );
}

export default function MetricsBar({ metrics }) {
  const waitHistory = metrics.history.map((entry) => entry.wait);
  const servedHistory = metrics.history.map((entry) => entry.served);
  const utilizationHistory = metrics.history.map((entry) => entry.utilization);

  return (
    <section
      className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 xl:gap-3"
      aria-label="Indicateurs de flotte en direct"
    >
      <CardShell accent="yellow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="eyebrow truncate">
              <span className="sm:hidden">Attente</span>
              <span className="hidden sm:inline">Attente moyenne</span>
            </p>
            <div className="mt-1.5 flex items-end gap-1.5">
              <span className="mono-num text-[26px] font-medium leading-none tracking-[-0.045em] text-zinc-50 sm:text-[30px]">
                {metrics.avgWait.toFixed(1)}
              </span>
              <span className="mb-0.5 font-mono text-[10px] text-zinc-500">min</span>
            </div>
          </div>
          <MetricIcon icon={Clock3} tone="yellow" />
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <TrendPill value={metrics.waitTrend} lowerIsBetter />
            <span className="truncate font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-600">
              <span className="sm:hidden">vs préc.</span>
              <span className="hidden sm:inline">vs fenêtre précédente</span>
            </span>
          </div>
          <Sparkline values={waitHistory} color="#ffd400" id="wait-spark" />
        </div>
      </CardShell>

      <CardShell accent="amber">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="eyebrow truncate">
              <span className="sm:hidden">Flotte</span>
              <span className="hidden sm:inline">Flotte active</span>
            </p>
            <div className="mt-1.5 flex items-end gap-1.5">
              <span className="mono-num text-[26px] font-medium leading-none tracking-[-0.045em] text-zinc-50 sm:text-[30px]">
                {metrics.activeFleet}
              </span>
              <span className="mb-0.5 font-mono text-[10px] text-zinc-500">
                / {metrics.totalFleet}
              </span>
            </div>
          </div>
          <MetricIcon icon={BusFront} tone="amber" />
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] text-zinc-400">
              {metrics.parkedFleet} en réserve
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: metrics.totalFleet }, (_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-colors duration-500 ${
                    index < metrics.activeFleet
                      ? 'w-2.5 bg-yellow-300 shadow-[0_0_5px_rgba(255,212,0,.65)] sm:w-3.5'
                      : 'w-1.5 bg-white/12 sm:w-2'
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="hidden rounded-md border border-yellow-300/15 bg-yellow-300/[0.05] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-yellow-200/80 sm:inline">
            {metrics.parkedFleet > 0 ? 'Réserve prête' : 'Complet'}
          </span>
        </div>
      </CardShell>

      <CardShell accent="orange">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="eyebrow truncate">
              <span className="sm:hidden">Utilisation</span>
              <span className="hidden sm:inline">Taux d’utilisation</span>
            </p>
            <div className="mt-1.5 flex items-end gap-1.5">
              <span className="mono-num text-[26px] font-medium leading-none tracking-[-0.045em] text-zinc-50 sm:text-[30px]">
                {metrics.utilization}
              </span>
              <span className="mb-0.5 font-mono text-[10px] text-zinc-500">%</span>
            </div>
          </div>
          <MetricIcon icon={Gauge} tone="orange" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-600">
              <span className="sm:hidden">Déploiement</span>
              <span className="hidden sm:inline">taux de déploiement</span>
            </span>
            <span className="shrink-0 whitespace-nowrap font-mono text-[9px] text-zinc-400">
              <span className="hidden sm:inline">charge </span>
              {metrics.occupancy}
              <span className="hidden sm:inline"> %</span>
              <span className="sm:hidden">%</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400/80 via-yellow-300 to-yellow-200 shadow-[0_0_8px_rgba(255,212,0,.45)] transition-[width] duration-700"
              style={{ width: `${metrics.utilization}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="truncate font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-600">
              {metrics.onboardTotal}
              <span className="sm:hidden"> à bord</span>
              <span className="hidden sm:inline"> voyageurs à bord</span>
            </span>
            <div className="flex items-center gap-0.5">
              {utilizationHistory.slice(-10).map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="h-2 w-px rounded-full bg-yellow-300/25"
                />
              ))}
            </div>
          </div>
        </div>
      </CardShell>

      <CardShell accent="slate">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="eyebrow truncate">
              <span className="sm:hidden">Servis</span>
              <span className="hidden sm:inline">Voyageurs servis</span>
            </p>
            <div className="mt-1.5 flex items-end gap-1.5">
              <span className="mono-num text-[26px] font-medium leading-none tracking-[-0.045em] text-zinc-50 sm:text-[30px]">
                {formatNumber(metrics.servedTotal)}
              </span>
            </div>
          </div>
          <MetricIcon icon={Users} tone="slate" />
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="inline-flex w-fit items-center gap-1 rounded-md border border-emerald-400/15 bg-emerald-400/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
              <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2.1} />+
              {formatNumber(Math.max(0, metrics.servedDelta))}
            </span>
            <span className="truncate font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-600">
              <span className="sm:hidden">cumul jour</span>
              <span className="hidden sm:inline">total réseau aujourd’hui</span>
            </span>
          </div>
          <Sparkline values={servedHistory} color="#94a3b8" id="served-spark" />
        </div>
      </CardShell>
    </section>
  );
}
