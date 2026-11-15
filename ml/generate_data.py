"""Generate a reproducible synthetic Casablanca demand dataset for model training.

The generator mirrors the Casabus demo network and the time-of-day profile used by
the front-end (src/data/network.js), then adds nonlinear interactions and Poisson
noise. It writes `ml/training-data.csv`.
"""
import json
import math
import random
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
NETWORK_PATH = ROOT / "network.json"
OUTPUT_PATH = ROOT / "training-data.csv"
SEED = 20260415
ROWS = 30000

HUBS = {"casa-voyageurs", "maarif"}


def time_of_day_factor(minutes):
    hour = ((minutes / 60) % 24 + 24) % 24
    morning = 0.72 * math.exp(-0.5 * ((hour - 8.1) / 1.25) ** 2)
    evening = 0.9 * math.exp(-0.5 * ((hour - 17.35) / 1.7) ** 2)
    midday = 0.18 * math.exp(-0.5 * ((hour - 12.7) / 2.4) ** 2)
    return 0.42 + morning + evening + midday


def is_peak(hour):
    return 1 if (7.0 <= hour <= 9.5) or (16.5 <= hour <= 19.5) else 0


def main():
    random.seed(SEED)
    np.random.seed(SEED)

    with open(NETWORK_PATH, encoding="utf-8") as handle:
        network = json.load(handle)

    stops = network["stops"]
    scenarios = network["scenarios"]

    rows = []
    for _ in range(ROWS):
        stop = random.choice(stops)
        scenario = random.choices(
            scenarios, weights=[0.58, 0.27, 0.15], k=1
        )[0]
        sim_minutes = random.uniform(5 * 60, 23.5 * 60)
        hour = (sim_minutes / 60) % 24
        factor = time_of_day_factor(sim_minutes)
        stop_weight = scenario["stopWeights"].get(stop["id"], 1.0)

        # Live queue state, calibrated to the scenario and time of day.
        base_rate = stop["baseRate"]
        expected15 = base_rate * factor * scenario["arrivalMult"] * stop_weight * 15
        waiting_count = int(
            np.clip(
                np.random.poisson(lam=max(0.5, expected15 * 0.18))
                + (5 if scenario["id"] == "rush" else 0)
                + (12 if scenario["id"] == "stadium" and stop["id"] == "maarif" else 0),
                0,
                80,
            )
        )
        waits = np.random.exponential(scale=3.2 + factor, size=waiting_count) if waiting_count else np.array([])
        avg_wait = float(waits.mean()) if waits.size else 0.0
        longest_wait = float(waits.max()) if waits.size else 0.0

        hub_linked = 1.0 if stop["id"] in HUBS else 0.0

        # Ground-truth demand over the next 30 minutes with nonlinear effects.
        future_factor = time_of_day_factor(sim_minutes + 15)
        expected30 = base_rate * future_factor * scenario["arrivalMult"] * stop_weight * 30
        expected30 *= 1.0 + 0.18 * (factor ** 2)
        expected30 += hub_linked * 8.0 * scenario["arrivalMult"] * is_peak(hour)
        if stop["id"] == "ain-diab":
            expected30 += 4.5 * future_factor
        # Queue feedback: sustained congestion pulls more demand to nearby corridors.
        expected30 += waiting_count * (0.07 + 0.05 * is_peak(hour))
        expected30 = float(max(0.0, expected30))
        # Poisson-like noise.
        demand = int(np.random.poisson(lam=expected30)) if expected30 > 0 else 0

        rows.append(
            {
                "base_rate": base_rate,
                "time_factor": factor,
                "scenario_mult": scenario["arrivalMult"],
                "stop_weight": stop_weight,
                "waiting_count": waiting_count,
                "avg_wait": avg_wait,
                "longest_wait": longest_wait,
                "hour_sin": math.sin(2 * math.pi * hour / 24.0),
                "hour_cos": math.cos(2 * math.pi * hour / 24.0),
                "is_peak": is_peak(hour),
                "expected_15": expected15,
                "hub_linked": hub_linked,
                "demand_next_30m": demand,
            }
        )

    frame = pd.DataFrame(rows)
    frame.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote {len(frame)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
