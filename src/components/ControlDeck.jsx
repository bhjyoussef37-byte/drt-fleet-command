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
      'border-yellow-300/30 bg-yellow-300/[0.11] text-yellow-100 shadow-[0_0_18px_-8px_rgba(255,212,0,.8)]',
    dot: 'bg-yellow-300',
  },
  rush: {
    icon: TrendingUp,
    active:
      'border-orange-400/30 bg-orange-400/[0.1] text-orange-200 shadow-[0_0_18px_-8px_rgba(251,146,60,.75)]',
    dot: 'bg-orange-400',
  },
  stadium: {
    icon: Ticket,
    active:
      'border-rose-400/30 bg-rose-400/[0.1] text-rose-200 shadow-[0_0_18px_-8px_rgba(244,63,94,.7)]',
    dot: 'bg-rose-400',
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
    <section className="panel px-3 py-3 sm:px-4" aria-label="Commandes de simulation">
      <div className="relative z-10 flex flex-col gap-3.5 lg:flex-row lg:flex-wrap lg:items-center xl:flex-nowrap xl:gap-4">
        <div className="flex items-center gap-3 lg:w-auto xl:w-[185px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-yellow-300/15 bg-yellow-300/[0.06] text-yellow-300">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[12px] font-medium tracking-wide text-zinc-100">
              Poste de commande
            </h2>
            <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.06em] text-zinc-500">
              <span
                className={`h-1 w-1 rounded-full ${
                  running
                    ? 'bg-yellow-300 shadow-[0_0_6px_rgba(255,212,0,.85)]'
                    : 'bg-orange-400'
                }`}
              />
              {running ? 'Direct · optimiseur actif' : 'En pause · horloge figée'}
            </p>
          </div>
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-white/[0.07] xl:block" />

        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <button
            type="button"
            onClick={onToggleRunning}
            className={`focus-ring group inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-[11px] font-semibold transition-all duration-200 ${
              running
                ? 'border-white/10 bg-white/[0.055] text-zinc-200 hover:border-white/20 hover:bg-white/[0.08]'
                : 'border-yellow-200/40 bg-gradient-to-b from-yellow-300 to-yellow-400 text-[#171204] shadow-[0_8px_24px_-12px_rgba(255,212,0,.9)] hover:from-yellow-200 hover:to-yellow-300'
            }`}
            aria-label={running ? 'Mettre la simulation en pause' : 'Démarrer la simulation'}
          >
            {running ? (
              <Pause className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" />
            ) : (
              <Play className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" />
            )}
            {running ? 'Pause' : 'Démarrer'}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-[11px] font-medium text-zinc-400 transition-colors hover:border-white/15 hover:bg-white/[0.055] hover:text-zinc-200"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.9} />
            Réinitialiser
          </button>

          <button
            type="button"
            onClick={onDispatch}
            disabled={parkedFleet === 0}
            title={
              parkedFleet === 0
                ? 'Toutes les unités sont déjà déployées'
                : 'Déployer un bus de réserve vers l’arrêt sélectionné ou le plus chargé'
            }
            className="focus-ring group inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-yellow-300/25 bg-yellow-300/[0.075] px-3 text-[11px] font-medium text-yellow-100 transition-all hover:border-yellow-200/40 hover:bg-yellow-300/[0.13] disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-zinc-600"
            aria-label="Déployer un bus manuellement"
          >
            <span className="relative">
              <BusFront className="h-3.5 w-3.5" strokeWidth={1.9} />
              <span className="absolute -right-1.5 -top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-yellow-300 text-[#171204] group-disabled:bg-zinc-700">
                <Plus className="h-2 w-2" strokeWidth={3} />
              </span>
            </span>
            Déploiement manuel
          </button>
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-white/[0.07] xl:block" />

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="eyebrow">Scénario de demande</span>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.08em] text-zinc-600 sm:block">
              modèle rééquilibré en direct
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.06] bg-black/25 p-1">
            {Object.values(SCENARIOS).map((item) => {
              const meta = SCENARIO_META[item.id];
              const Icon = meta.icon;
              const active = scenario === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onScenarioChange(item.id)}
                  className={`focus-ring group relative flex h-10 items-center justify-center gap-1.5 rounded-lg border px-1.5 text-[8px] font-medium leading-tight transition-all duration-200 sm:text-[9.5px] ${
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
            <span className="eyebrow">Vitesse de simulation</span>
            <span className="inline-flex items-center gap-1 rounded border border-yellow-300/20 bg-yellow-300/[0.07] px-1.5 py-0.5 font-mono text-[9px] text-yellow-200">
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
              aria-label="Vitesse de simulation"
              aria-valuetext={`${speed} fois la vitesse`}
            />
            <div className="mt-1.5 flex justify-between px-0.5">
              {[1, 2, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSpeedChange(value)}
                  className={`font-mono text-[8px] transition-colors ${
                    speed === value ? 'text-yellow-300' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                  aria-label={`Régler la simulation sur ${value} fois la vitesse`}
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
