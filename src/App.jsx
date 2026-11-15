import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import Header from './components/Header.jsx';
import MetricsBar from './components/MetricsBar.jsx';
import ControlDeck from './components/ControlDeck.jsx';
import TransitMap from './components/TransitMap.jsx';
import ForecastPanel from './components/ForecastPanel.jsx';
import OptimizationLog from './components/OptimizationLog.jsx';
import { useSimulation } from './hooks/useSimulation.js';
import { selectMetrics } from './simulation/engine.js';

const TOAST_META = {
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-400/25',
    iconColor: 'text-emerald-300',
    glow: 'shadow-[0_20px_60px_-20px_rgba(0,0,0,.9),0_0_30px_-18px_rgba(52,211,153,.8)]',
  },
  info: {
    icon: Info,
    border: 'border-yellow-400/25',
    iconColor: 'text-yellow-300',
    glow: 'shadow-[0_20px_60px_-20px_rgba(0,0,0,.9),0_0_30px_-18px_rgba(255,212,0,.75)]',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-orange-400/25',
    iconColor: 'text-orange-300',
    glow: 'shadow-[0_20px_60px_-20px_rgba(0,0,0,.9),0_0_30px_-18px_rgba(251,146,60,.7)]',
  },
};

export default function App() {
  const { state, actions } = useSimulation();
  const metrics = useMemo(() => selectMetrics(state), [state]);
  const activeBuses = useMemo(
    () => state.buses.filter((bus) => bus.status === 'active'),
    [state.buses],
  );
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!state.notice) return undefined;
    setToast(state.notice);
    const timeout = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timeout);
  }, [state.notice]);

  const toastMeta = toast ? TOAST_META[toast.tone] ?? TOAST_META.info : null;
  const ToastIcon = toastMeta?.icon;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="zellige absolute inset-0" />
        <div className="absolute -top-48 left-1/3 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-yellow-400/[0.045] blur-[120px]" />
        <div className="absolute -right-40 top-12 h-[400px] w-[500px] rounded-full bg-rose-500/[0.025] blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-[260px] w-[520px] rounded-full bg-emerald-500/[0.018] blur-[100px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1680px] px-3 py-3.5 sm:px-5 sm:py-4 lg:px-7">
        <Header
          running={state.running}
          simMinutes={state.simMinutes}
          scenario={state.scenario}
        />

        <main className="mt-3 space-y-3 sm:mt-4">
          <MetricsBar metrics={metrics} />

          <ControlDeck
            running={state.running}
            speed={state.speed}
            scenario={state.scenario}
            parkedFleet={metrics.parkedFleet}
            onToggleRunning={actions.toggleRunning}
            onReset={actions.reset}
            onDispatch={() => actions.dispatchManual(state.selectedStop)}
            onScenarioChange={actions.setScenario}
            onSpeedChange={actions.setSpeed}
          />

          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
            <TransitMap
              state={state}
              activeBuses={activeBuses}
              metrics={metrics}
              onSelectStop={actions.selectStop}
              onPrioritize={actions.prioritizeStop}
              onDispatchSelected={actions.dispatchManual}
            />

            <aside className="flex min-w-0 flex-col gap-3 sm:gap-3.5 xl:col-span-4">
              <ForecastPanel state={state} />
              <OptimizationLog
                logs={state.logs}
                optimizerPasses={state.optimizerPasses}
              />
            </aside>
          </div>
        </main>

        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.045] px-1 pt-3 font-mono text-[7px] uppercase tracking-[0.12em] text-zinc-700 sm:text-[7.5px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-2.5 w-2.5 text-yellow-400/55" />
              CASABUS · RÉSEAU AL BAIDA
            </span>
            <span>Bac à sable de dispatch autonome</span>
            <span className="hidden sm:inline">Maillage 10 arrêts · inférence locale</span>
            <span className="hidden lg:inline">Prototype non affilié · démonstration</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Waves className="h-2.5 w-2.5 text-yellow-400/50" />
              Flux capteurs nominal
            </span>
            <span className="text-zinc-600">
              {state.running ? 'Simulation en cours' : 'Simulation en pause'}
            </span>
          </div>
        </footer>
      </div>

      {toast && ToastIcon && (
        <div
          className={`toast-enter fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm items-center gap-2.5 rounded-xl border bg-[#081014]/95 px-3.5 py-3 backdrop-blur-xl sm:bottom-6 ${toastMeta.border} ${toastMeta.glow}`}
          role="status"
          aria-live="polite"
        >
          <ToastIcon
            className={`h-4 w-4 shrink-0 ${toastMeta.iconColor}`}
            strokeWidth={1.9}
          />
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-zinc-200">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[14px] leading-none text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-zinc-300"
            aria-label="Fermer la notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
