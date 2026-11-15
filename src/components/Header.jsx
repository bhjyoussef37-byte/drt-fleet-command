import {
  BusFront,
  Clock3,
  Cpu,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { formatClock } from '../lib/format.js';

export default function Header({ running, simMinutes }) {
  return (
    <header className="flex items-center gap-3 sm:gap-4">
      <div className="flex shrink-0 items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11">
          <div className="absolute inset-0 rounded-xl bg-yellow-400/25 blur-xl" />
          <div className="absolute inset-0 rounded-xl border border-yellow-300/40 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_0_28px_-8px_rgba(255,212,0,.7)]" />
          <BusFront
            className="relative h-[21px] w-[21px] text-[#111111]"
            strokeWidth={2}
          />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-[#0a0a0b] bg-[#e63946] shadow-[0_0_8px_rgba(230,57,70,.9)]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-[16px] font-semibold leading-none tracking-[0.16em] text-zinc-50 sm:text-[18px]">
              CASA<span className="text-yellow-300">BUS</span>
            </h1>
            <span className="rounded border border-yellow-300/25 bg-yellow-300/[0.08] px-1.5 py-0.5 font-mono text-[7.5px] font-medium uppercase tracking-[0.14em] text-yellow-200 sm:text-[8px]">
              Al Baida
            </span>
            <span className="hidden font-arabic text-[10px] leading-none text-yellow-300/75 md:inline">
              الدار البيضاء
            </span>
          </div>
          <p className="mt-1.5 truncate font-mono text-[7.5px] uppercase tracking-[0.15em] text-zinc-500 sm:text-[8.5px]">
            Centre de commande · Casablanca
          </p>
        </div>
      </div>

      <div
        className={`ml-1 hidden shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.11em] lg:flex ${
          running
            ? 'border-yellow-300/20 bg-yellow-300/[0.06] text-yellow-200'
            : 'border-orange-400/20 bg-orange-400/[0.055] text-orange-300'
        }`}
      >
        <span className={`live-dot ${running ? '' : 'amber'}`} />
        {running ? 'Réseau en direct' : 'Simulation en pause'}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
        <div className="hidden items-center gap-2 rounded-lg border border-white/[0.075] bg-white/[0.025] px-2.5 py-1.5 md:flex">
          <Cpu className="h-3.5 w-3.5 text-yellow-300/80" strokeWidth={1.7} />
          <div className="leading-none">
            <p className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-zinc-500">
              IA prédictive
            </p>
            <p className="mt-1 flex items-center gap-1 font-mono text-[8.5px] text-zinc-300">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              98,4 % sain
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 rounded-lg border border-white/[0.075] bg-white/[0.025] px-2.5 py-1.5 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-yellow-300/75" strokeWidth={1.7} />
          <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-zinc-400">
            Réseau 18
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141416]/85 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] sm:gap-2.5 sm:px-3">
          <Clock3 className="h-3.5 w-3.5 text-yellow-300/80" strokeWidth={1.7} />
          <div className="leading-none">
            <p className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-zinc-500">
              Horloge sim
            </p>
            <p className="mono-num mt-1 font-mono text-[12px] font-medium tracking-wide text-zinc-100">
              {formatClock(simMinutes)}
            </p>
          </div>
          <span className="relative ml-0.5 hidden h-5 w-5 items-center justify-center rounded-full border border-yellow-300/20 bg-yellow-300/[0.07] sm:flex">
            <Radio className="h-2.5 w-2.5 text-yellow-300" strokeWidth={2} />
            <span className="absolute inset-0 animate-ping rounded-full border border-yellow-300/25 [animation-duration:2.8s]" />
          </span>
        </div>

        <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-yellow-300/20 bg-gradient-to-br from-yellow-300/15 to-zinc-900 font-mono text-[9px] font-medium text-yellow-200 xl:flex">
          OP
        </div>
      </div>
    </header>
  );
}
