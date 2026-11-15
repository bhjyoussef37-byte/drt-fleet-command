import {
  Activity,
  BusFront,
  Gauge,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { SCENARIOS } from '../data/network.js';

const SCENARIO_META = {
  normal: {
    icon: Activity,
    active:
      'border-emerald-400/25 bg-emerald-400/[0.09] text-emerald-200 shadow-[0_0_18px_-8px_rgba(52,211,153,.8)]',
    dot: 'bg-emerald-400',
  },
  rush: {
    icon: TrendingUp,
    active:
      'border-amber-400/25 bg-amber-400/[0.09] text-amber-200 shadow-[0_0_18px_-8px_rgba(251,191,36,.75)]',
    dot: 'bg-amber-400',
  },
  stadium: {
    icon: Ticket,
    active:
      'border-fuchsia-400/25 bg-fuchsia-400/[0.09] text-fuchsia-200 shadow-[0_0_18px_-8px_rgba(232,121,249,.7)]',
    dot: 'bg-fuchsia-400',
  },
};

export default function ControlDeck({
  running,
  speed,
  scenario,
  parkedFleet,
  onToggleRunning,
  onReset,
  onDispatch,
  onScenarioChange,
  onSpeedChange,
}) {
  const speedIndex = speed === 1 ? 0 : speed === 2 ? 1 : 2;

  return (
    <section className="panel px-3 py-3 sm:px-4" aria-label="Simulation controls">
      <div className="relative z-10 flex flex-col gap-3.5 lg:flex-row lg:flex-wrap lg:items-center xl:flex-nowrap xl:gap-4">
        <div className="flex items-center gap-3 lg:w-auto xl:w-[185px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-zinc-400">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[12px] font-medium tracking-wide text-zinc-200">
              Simulation Control
            </h2>
            <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.06em] text-zinc-600">
              <span
                className={`h-1 w-1 rounded-full ${
                  running ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.8)]' : 'bg-amber-400'
                }`}
              />
              {running ? 'Live · optimizer engaged' : 'Paused · clock frozen'}
            </p>
          </div>
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-white/[0.07] xl:block" />

        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <button
            type="button"
            onClick={onToggleRunning}
            className={`focus-ring group inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-[11px] font-medium transition-all duration-200 ${
              running
                ? 'border-white/10 bg-white/[0.055] text-zinc-200 hover:border-white/20 hover:bg-white/[0.08]'
                : 'border-emerald-300/30 bg-gradient-to-b from-emerald-300 to-emerald-400 text-[#04110c] shadow-[0_8px_24px_-12px_rgba(52,211,153,.8)] hover:from-emerald-200 hover:to-emerald-300'
            }`}
            aria-label={running ? 'Pause simulation' : 'Start simulation'}
          >
            {running ? (
              <Pause className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" />
            ) : (
              <Play className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" />
            )}
            {running ? 'Pause' : 'Start'}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-[11px] font-medium text-zinc-400 transition-colors hover:border-white/15 hover:bg-white/[0.055] hover:text-zinc-200"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.9} />
            Reset
          </button>

          <button
            type="button"
            onClick={onDispatch}
            disabled={parkedFleet === 0}
            title={
              parkedFleet === 0
                ? 'All fleet units are already deployed'
                : 'Deploy a reserve bus to the selected or busiest stop'
            }
            className="focus-ring group inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.055] px-3 text-[11px] font-medium text-cyan-200 transition-all hover:border-cyan-300/35 hover:bg-cyan-400/[0.1] disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-zinc-600"
            aria-label="Dispatch manual bus"
          >
            <span className="relative">
              <BusFront className="h-3.5 w-3.5" strokeWidth={1.9} />
              <span className="absolute -right-1.5 -top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-cyan-300 text-[#061418] group-disabled:bg-zinc-700">
                <Plus className="h-2 w-2" strokeWidth={3} />
              </span>
            </span>
            Manual dispatch
          </button>
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-white/[0.07] xl:block" />

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="eyebrow">Demand scenario</span>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-600 sm:block">
              model re-weights live
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-1">
            {Object.values(SCENARIOS).map((item) => {
              const meta = SCENARIO_META[item.id];
              const Icon = meta.icon;
              const active = scenario === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onScenarioChange(item.id)}
                  className={`focus-ring group relative flex h-9 items-center justify-center gap-1.5 rounded-lg border px-1.5 text-[8px] font-medium leading-tight transition-all duration-200 sm:text-[9.5px] ${
                    active
                      ? meta.active
                      : 'border-transparent text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-300'
                  }`}
                  aria-pressed={active}
                  title={item.description}
                >
                  <Icon className="h-3 w-3 shrink-0" strokeWidth={1.9} />
                  <span className="min-w-0 text-center leading-[1.08]">
                    {item.label}
                  </span>
                  {active && (
                    <span
                      className={`absolute right-1.5 top-1.5 hidden h-1 w-1 rounded-full sm:block ${meta.dot}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-white/[0.07] xl:block" />

        <div className="w-full shrink-0 xl:w-[185px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Simulation speed</span>
            <span className="inline-flex items-center gap-1 rounded border border-emerald-400/15 bg-emerald-400/[0.05] px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
              <Gauge className="h-2.5 w-2.5" strokeWidth={2} />
              {speed}×
            </span>
          </div>
          <div className="px-0.5">
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={speedIndex}
              onChange={(event) => {
                const speeds = [1, 2, 5];
                onSpeedChange(speeds[Number(event.target.value)]);
              }}
              className="speed-range focus-ring"
              style={{ '--fill': `${(speedIndex / 2) * 100}%` }}
              aria-label="Simulation speed"
              aria-valuetext={`${speed} times speed`}
            />
            <div className="mt-1.5 flex justify-between px-0.5">
              {[1, 2, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSpeedChange(value)}
                  className={`font-mono text-[8px] transition-colors ${
                    speed === value ? 'text-emerald-300' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                  aria-label={`Set simulation to ${value} times speed`}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
