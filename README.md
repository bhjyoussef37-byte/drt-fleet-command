# NEXUS · DRT Fleet Command

An interactive, dark-mode smart-city control center for a Demand-Responsive Transit
(DRT) fleet. The prototype runs a live in-browser simulation: passengers arrive at
stops, queues age by urgency, buses move along the transit mesh, and a mocked ML
optimizer continuously rebalances the fleet.

Built with **React 19**, **Vite 7**, **Tailwind CSS 4**, and **Lucide React**.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL (defaults to `http://localhost:5173`).

```bash
npm run build    # production bundle in dist/
npm run preview  # serve the production bundle
npm run smoke    # headless simulation checks (no browser needed)
```

## What's inside

### Live transit map
- 10 interconnected stops rendered as an accessible SVG network.
- Passenger request dots build up at each stop and shift green → yellow → red by wait time.
- Active buses move between stops, reroute based on demand, and board/alight riders.
- Dedicated portrait layout for mobile; stop labels stay readable as buses pass underneath.
- Click any stop to open an inspector with queue details, wait distribution, and a
  one-click **Prioritize pickup** action.

### Control deck
- Start / Pause, Reset, and **Manual dispatch** (deploys reserve units until 8/8 active).
- Simulation speed slider at 1×, 2×, or 5×.
- Demand scenarios: **Normal**, **Rush Hour Surge**, and **Stadium Event Spike**.
  Switching a scenario injects a burst of requests and re-weights the optimizer.

### ML demand forecast
- Four 15-minute bins covering the next hour, with 15 / 30 / 60-minute rollups.
- Confidence, predicted peak, and the top three demand hotspots.
- Hotspot selection drives optimizer redirects, shown in the live log.

### Optimization engine
- Fleet-level passes redirect the nearest available unit toward forecast hotspots.
- Queue pressure, longest wait, forecast lift, hop distance, and coverage stacking
  all contribute to target selection.
- Every dispatch, reroute, scenario change, and reset is explained in a live log.

### Metrics bar
- Average passenger wait with trend and sparkline.
- Active fleet vs. depot reserve and utilization %.
- Total passengers served today with a running delta.

## Project structure

```
src/
  App.jsx                 Dashboard shell, layout, and toasts
  components/
    Header.jsx            Brand, live status, sim clock
    MetricsBar.jsx        Top metric cards and sparklines
    ControlDeck.jsx       Speed, scenario, and action controls
    TransitMap.jsx        Interactive SVG network, buses, stop inspector
    ForecastPanel.jsx     ML forecast chart and hotspots
    OptimizationLog.jsx   Live dispatch rationale feed
  simulation/engine.js    Reducer, tick loop, routing, optimizer, metrics
  data/network.js         Stops, edges, scenarios, BFS routing helpers
  lib/forecast.js         Mocked ML forecast model
  lib/format.js           Formatting and urgency helpers
  hooks/                  Simulation interval and responsive map hooks
scripts/smoke.mjs         Node-based simulation assertions
```

## Notes

- All demand forecasting and optimization logic is intentionally mocked for the
  demo, but it is stateful and reacts to live queues rather than replaying a video.
- The simulation is deterministic in structure (same rules every run) while arrival
  jitter keeps each session different.
