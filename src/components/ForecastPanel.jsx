import { useMemo } from 'react';
import {
  ArrowUpRight,
  BrainCircuit,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { buildForecast } from '../lib/forecast.js';
import { formatNumber } from '../lib/format.js';

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
    <section className="panel overflow-hidden" aria-label="ML demand forecast">
      <div className="relative z-10 px-3.5 pb-3 pt-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.065] text-cyan-300 shadow-[0_0_24px_-10px_rgba(34,211,238,.8)]">
              <BrainCircuit className="h-4 w-4" strokeWidth={1.7} />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-[#081014] bg-cyan-300" />
            </span>
            <div>
              <h2 className="text-[12px] font-medium tracking-wide text-zinc-200">
                ML Demand Forecast
              </h2>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-600">
                Gradient boosted · 15 min bins
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-400/12 bg-cyan-400/[0.04] px-2 py-1 font-mono text-[8px] text-cyan-300/90">
            <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(34,211,238,.8)]" />
            {forecast.confidence}% conf.
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Next 60 minutes</p>
            <div className="mt-1 flex items-end gap-1.5">
              <span className="mono-num text-[27px] font-medium leading-none tracking-[-0.045em] text-zinc-50">
                {formatNumber(total)}
              </span>
              <span className="mb-0.5 font-mono text-[9px] text-zinc-500">
                riders
              </span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 font-mono text-[8.5px] font-medium ${
              surge
                ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'
                : 'border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300'
            }`}
          >
            <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.2} />
            {overallDelta >= 0 ? '+' : ''}
            {overallDelta}% vs baseline
          </span>
        </div>

        <div className="relative mt-2.5 h-[98px] overflow-hidden rounded-lg border border-white/[0.055] bg-black/15 px-2.5 pb-1 pt-4">
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
                  title={`${bin.label}: predicted ${bin.value} passenger requests`}
                >
                  <span
                    className={`mono-num absolute inset-x-0 text-center font-mono text-[8px] leading-none ${
                      peak ? 'text-cyan-200' : 'text-zinc-500'
                    }`}
                    style={{ bottom: `calc(${height}% + 4px)` }}
                  >
                    {bin.value}
                  </span>
                  <div
                    className={`forecast-bar relative w-full overflow-hidden rounded-t-[3px] ${
                      peak
                        ? 'shadow-[0_0_18px_-4px_rgba(34,211,238,.4)]'
                        : ''
                    }`}
                    style={{
                      height: `${height}%`,
                      background: peak
                        ? 'linear-gradient(180deg, rgba(103,232,249,.86) 0%, rgba(34,211,238,.5) 38%, rgba(52,211,153,.1) 100%)'
                        : `linear-gradient(180deg, rgba(52,211,153,${0.5 + index * 0.1}) 0%, rgba(34,211,238,.22) 50%, rgba(34,211,238,.035) 100%)`,
                    }}
                  >
                    <span className="absolute inset-x-0 top-0 h-px bg-white/40" />
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
                    horizon.delta > 0 ? 'text-cyan-300/60' : 'text-zinc-600'
                  }`}
                  strokeWidth={1.8}
                />
              </div>
              <p className="mono-num mt-0.5 text-[14px] font-medium leading-none text-zinc-100">
                {formatNumber(horizon.value)}
              </p>
              <p
                className={`mt-1 font-mono text-[7.5px] ${
                  horizon.delta > 0 ? 'text-cyan-300/65' : 'text-zinc-600'
                }`}
              >
                {horizon.delta >= 0 ? '+' : ''}
                {horizon.delta}% lift
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-zinc-500">
              <Sparkles className="h-2.5 w-2.5 text-cyan-300/70" />
              Surge hotspots / next 30 min
            </span>
            <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-zinc-700">
              {forecast.waitingTotal} queued now
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
                      ? 'border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300'
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
                        {hotspot.waiting} live
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
                          ? 'bg-gradient-to-r from-cyan-400/70 to-emerald-300/70'
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
                      ? 'border-amber-400/15 bg-amber-400/[0.04] text-amber-300/85'
                      : 'border-white/[0.05] text-zinc-600'
                  }`}
                >
                  +{hotspot.lift}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
