import { Cpu, Radio } from 'lucide-react';
import { formatClock } from '../lib/format.js';

const TAG_STYLES = {
  OPTIMIZER: {
    text: 'text-cyan-300',
    chip: 'border-cyan-400/15 bg-cyan-400/[0.055] text-cyan-300',
    dot: 'bg-cyan-400',
  },
  DISPATCH: {
    text: 'text-emerald-300',
    chip: 'border-emerald-400/15 bg-emerald-400/[0.055] text-emerald-300',
    dot: 'bg-emerald-400',
  },
  FORECAST: {
    text: 'text-amber-300',
    chip: 'border-amber-400/15 bg-amber-400/[0.05] text-amber-300',
    dot: 'bg-amber-400',
  },
  NETWORK: {
    text: 'text-sky-300',
    chip: 'border-sky-400/15 bg-sky-400/[0.05] text-sky-300',
    dot: 'bg-sky-400',
  },
  ALERT: {
    text: 'text-rose-300',
    chip: 'border-rose-400/15 bg-rose-400/[0.05] text-rose-300',
    dot: 'bg-rose-400',
  },
  SCENARIO: {
    text: 'text-fuchsia-300',
    chip: 'border-fuchsia-400/15 bg-fuchsia-400/[0.05] text-fuchsia-300',
    dot: 'bg-fuchsia-400',
  },
  SYSTEM: {
    text: 'text-zinc-400',
    chip: 'border-white/[0.07] bg-white/[0.03] text-zinc-500',
    dot: 'bg-zinc-500',
  },
};

export default function OptimizationLog({ logs, optimizerPasses }) {
  return (
    <section
      className="panel flex h-[300px] flex-col overflow-hidden sm:h-[320px] xl:h-[288px]"
      aria-label="Optimization engine activity log"
    >
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3.5 py-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.075] bg-white/[0.03] text-zinc-400">
            <Cpu className="h-4 w-4" strokeWidth={1.7} />
          </span>
          <div>
            <h2 className="text-[12px] font-medium tracking-wide text-zinc-200">
              Optimization Engine
            </h2>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.09em] text-zinc-600">
              Live dispatch rationale · pass #{optimizerPasses}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/12 bg-emerald-400/[0.04] px-2 py-1 font-mono text-[7.5px] uppercase tracking-[0.09em] text-emerald-300/80">
          <Radio className="h-2.5 w-2.5" strokeWidth={1.9} />
          Streaming
        </span>
      </div>

      <div
        className="thin-scroll relative z-10 flex-1 overflow-y-auto overscroll-contain"
        aria-live="polite"
      >
        {logs.map((log) => {
          const style = TAG_STYLES[log.tag] ?? TAG_STYLES.SYSTEM;
          return (
            <article
              key={log.id}
              className="log-entry border-b border-white/[0.04] px-3.5 py-2.5 last:border-b-0 sm:px-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[7.5px] tabular-nums tracking-[0.04em] text-zinc-600">
                  {formatClock(log.time)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[6.8px] font-medium uppercase tracking-[0.1em] ${style.chip}`}
                >
                  <span className={`h-1 w-1 rounded-full ${style.dot}`} />
                  {log.tag}
                </span>
                {log.level === 'warning' && (
                  <span className="h-1 w-1 rounded-full bg-amber-400/90 shadow-[0_0_5px_rgba(251,191,36,.7)]" />
                )}
              </div>
              <p className="mt-1.5 text-[10.5px] leading-[1.5] text-zinc-300/90">
                {log.message}
              </p>
              {log.detail && (
                <p className="mt-1 font-mono text-[7.5px] leading-relaxed tracking-[0.02em] text-zinc-600">
                  {log.detail}
                </p>
              )}
            </article>
          );
        })}
        {logs.length === 0 && (
          <div className="flex h-full items-center justify-center px-4 py-8 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
            Awaiting optimizer telemetry
          </div>
        )}
      </div>
    </section>
  );
}
