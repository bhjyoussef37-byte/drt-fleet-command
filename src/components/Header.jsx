import {
  Activity,
  Clock3,
  Cpu,
  Radio,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { formatClock } from '../lib/format.js';

export default function Header({ running, simMinutes }) {
  return (
    <header className="flex items-center gap-3 sm:gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11">
          <div className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-xl" />
          <div className="absolute inset-0 rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/20 via-[#0d1a1c] to-cyan-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,.14)]" />
          <Route
            className="relative h-[19px] w-[19px] text-emerald-300"
            strokeWidth={1.8}
          />
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-[#070b0e] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.9)]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold leading-none tracking-[0.22em] text-zinc-50 sm:text-lg">
              NEXUS
            </h1>
            <span className="rounded border border-white/10 bg-white/[0.035] px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              DRT
            </span>
          </div>
          <p className="mt-1.5 truncate font-mono text-[8px] uppercase tracking-[0.17em] text-zinc-600 sm:text-[9px]">
            Fleet command · Smart city ops
          </p>
        </div>
      </div>

      <div
        className={`ml-1 hidden shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] lg:flex ${
          running
            ? 'border-emerald-400/15 bg-emerald-400/[0.045] text-emerald-300/90'
            : 'border-amber-400/15 bg-amber-400/[0.045] text-amber-300/90'
        }`}
      >
        <span className={`live-dot ${running ? '' : 'amber'}`} />
        {running ? 'Live network' : 'Simulation paused'}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
        <div className="hidden items-center gap-2 rounded-lg border border-white/[0.065] bg-white/[0.025] px-2.5 py-1.5 md:flex">
          <Cpu className="h-3.5 w-3.5 text-cyan-300/80" strokeWidth={1.7} />
          <div className="leading-none">
            <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-600">
              ML core
            </p>
            <p className="mt-1 flex items-center gap-1 font-mono text-[9px] text-zinc-300">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              98.4% healthy
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 rounded-lg border border-white/[0.065] bg-white/[0.025] px-2.5 py-1.5 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300/75" strokeWidth={1.7} />
          <span className="font-mono text-[9px] uppercase tracking-[0.11em] text-zinc-500">
            Grid 04
          </span>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.075] bg-[#0a1115]/80 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.03)] sm:px-3">
          <Clock3 className="h-3.5 w-3.5 text-emerald-300/80" strokeWidth={1.7} />
          <div className="leading-none">
            <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-600">
              Sim clock
            </p>
            <p className="mono-num mt-1 font-mono text-[12px] font-medium tracking-wide text-zinc-100">
              {formatClock(simMinutes)}
            </p>
          </div>
          <span className="relative ml-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/15 bg-emerald-400/[0.06]">
            <Radio className="h-2.5 w-2.5 text-emerald-300" strokeWidth={2} />
            <span className="absolute inset-0 animate-ping rounded-full border border-emerald-400/20 [animation-duration:2.8s]" />
          </span>
        </div>

        <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-zinc-700/50 to-zinc-900 font-mono text-[10px] font-medium text-zinc-300 xl:flex">
          OP
        </div>
      </div>
    </header>
  );
}
