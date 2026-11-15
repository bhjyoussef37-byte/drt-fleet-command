import { useMemo } from 'react';
import {
  ArrowUpRight,
  BrainCircuit,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { buildForecast } from '../lib/forecast.js';
import { formatNumber } from '../lib/format.js';
import { MODEL_META } from '../lib/demandModel.js';

const BAR_LABELS = ['+15m', '+30m', '+45m', '+60m'];

export default function ForecastPanel({ state }) {
  const forecast = useMemo(
    () =>
      buildForecast({
        simMinutes: state.simMinutes,
        scenarioId: state.scenario,
        stops: state.stops,
      }),
    [state.simMinutes, state.scenario, state.stops],
  );

  const maxBin = Math.max(...forecast.bins.map((bin) => bin.value), 1);
  const total = forecast.horizons[2].value;
  const overallDelta = forecast.horizons[2].delta;
  const surge = forecast.surgeActive || overallDelta >= 10;
  const maxHotspot = Math.max(
    ...forecast.hotspots.map((hotspot) => hotspot.predicted),
    1,
  );

  return (
    <section className="panel overflow-hidden" aria-label="Prévision de la demande">
      <div className="relative z-10 px-3.5 pb-3 pt-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-yellow-300/20 bg-yellow-300/[0.075] text-yellow-200 shadow-[0_0_24px_-10px_rgba(255,212,0,.85)]">
              <BrainCircuit className="h-4 w-4" strokeWidth={1.7} />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-[#121214] bg-yellow-300" />
            </span>
            <div>
              <h2 className="text-[12px] font-medium tracking-wide text-zinc-100">
                Prévision de la demande
              </h2>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-500">
                Gradient boosting · pas de 15 min
              </p>
              <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-zinc-600">
                Modèle Python · scikit-learn · MAE {MODEL_META.metrics.mae} pax
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-yellow-300/15 bg-yellow-300/[0.05] px-2 py-1 font-mono text-[8px] text-yellow-200/90">
            <span className="h-1 w-1 rounded-full bg-yellow-300 shadow-[0_0_5px_rgba(255,212,0,.9)]" />
            {forecast.confidence.toFixed(1).replace('.', ',')} % conf.
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Prochaines 60 minutes</p>
            <div className="mt-1 flex items-end gap-1.5">
              <span className="mono-num text-[27px] font-medium leading-none tracking-[-0.045em] text-zinc-50">
                {formatNumber(total)}
              </span>
              <span className="mb-0.5 font-mono text-[9px] text-zinc-500">
                voyageurs
              </span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 font-mono text-[8.5px] font-medium ${
              surge
                ? 'border-orange-400/25 bg-orange-400/[0.07] text-orange-200'
                : 'border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300'
            }`}
          >
            <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.2} />
            {overallDelta >= 0 ? '+' : ''}
            {overallDelta} % vs référence
          </span>
        </div>

        <div className="relative mt-2.5 h-[98px] overflow-hidden rounded-lg border border-white/[0.055] bg-black/20 px-2.5 pb-1 pt-4">
          <div className="pointer-events-none absolute inset-x-2.5 bottom-6 top-4 flex flex-col justify-between">
            {[0, 1, 2, 3].map((line) => (
              <span key={line} className="h-px w-full bg-white/[0.045]" />
            ))}
          </div>

          <div className="relative flex h-full items-end gap-2">
            {forecast.bins.map((bin, index) => {
              const height = Math.max(9, (bin.value / maxBin) * 100);
              const peak = bin.value === maxBin;
              return (
                <div
                  key={bin.label}
                  className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                  title={`${bin.label} : ${bin.value} demandes prévues`}
                >
                  <span
                    className={`mono-num absolute inset-x-0 text-center font-mono text-[8px] leading-none ${
                      peak ? 'text-yellow-200' : 'text-zinc-500'
                    }`}
                    style={{ bottom: `calc(${height}% + 4px)` }}
                  >
                    {bin.value}
                  </span>
                  <div
                    className={`forecast-bar relative w-full overflow-hidden rounded-t-[3px] ${
                      peak
                        ? 'shadow-[0_0_18px_-4px_rgba(255,212,0,.5)]'
                        : ''
                    }`}
                    style={{
                      height: `${height}%`,
                      background: peak
                        ? 'linear-gradient(180deg, rgba(255,225,77,.98) 0%, rgba(255,212,0,.62) 38%, rgba(245,158,11,.12) 100%)'
                        : `linear-gradient(180deg, rgba(255,212,0,${0.44 + index * 0.1}) 0%, rgba(245,197,24,.24) 50%, rgba(245,158,11,.04) 100%)`,
                    }}
                  >
                    <span className="absolute inset-x-0 top-0 h-px bg-white/45" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pointer-events-none absolute bottom-1.5 left-2.5 right-2.5 flex gap-2">
            {BAR_LABELS.map((label) => (
              <span
                key={label}
                className="flex-1 text-center font-mono text-[7.5px] uppercase tracking-[0.06em] text-zinc-600"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {forecast.horizons.map((horizon) => (
            <div
              key={horizon.minutes}
              className="rounded-lg border border-white/[0.055] bg-white/[0.022] px-2 py-1"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[7px] uppercase tracking-[0.09em] text-zinc-600">
                  {horizon.minutes} min
                </span>
                <ArrowUpRight
                  className={`h-2.5 w-2.5 ${
                    horizon.delta > 0 ? 'text-yellow-300/70' : 'text-zinc-600'
                  }`}
                  strokeWidth={1.8}
                />
              </div>
              <p className="mono-num mt-0.5 text-[14px] font-medium leading-none text-zinc-100">
                {formatNumber(horizon.value)}
              </p>
              <p
                className={`mt-1 font-mono text-[7.5px] ${
                  horizon.delta > 0 ? 'text-yellow-300/70' : 'text-zinc-600'
                }`}
              >
                {horizon.delta >= 0 ? '+' : ''}
                {horizon.delta} % de hausse
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-zinc-500">
              <Sparkles className="h-2.5 w-2.5 text-yellow-300/75" />
              Points chauds / 30 prochaines min
            </span>
            <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-zinc-700">
              {forecast.waitingTotal} en attente
            </span>
          </div>

          <div className="mt-2 space-y-1.5">
            {forecast.hotspots.map((hotspot, index) => (
              <div
                key={hotspot.id}
                className="flex items-center gap-2 rounded-md px-1 py-0.5"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border font-mono text-[7px] ${
                    index === 0
                      ? 'border-yellow-300/25 bg-yellow-300/[0.1] text-yellow-200'
                      : 'border-white/[0.06] bg-white/[0.025] text-zinc-600'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[9px] text-zinc-300">
                      {hotspot.name}
                      <span className="ml-1.5 font-mono text-[7px] text-zinc-600">
                        {hotspot.waiting} en attente
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[8px] text-zinc-500">
                      ~{hotspot.predicted}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.045]">
                    <div
                      className={`h-full rounded-full ${
                        index === 0
                          ? 'bg-gradient-to-r from-amber-400/80 to-yellow-300/80'
                          : 'bg-zinc-600/55'
                      }`}
                      style={{
                        width: `${Math.max(8, (hotspot.predicted / maxHotspot) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded border px-1 py-0.5 font-mono text-[7px] ${
                    hotspot.lift > 25
                      ? 'border-orange-400/20 bg-orange-400/[0.05] text-orange-200/90'
                      : 'border-white/[0.05] text-zinc-600'
                  }`}
                >
                  +{hotspot.lift} %
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
