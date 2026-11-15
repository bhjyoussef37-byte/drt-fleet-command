"""Demo inference in Python using the trained gradient boosting model."""
import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "demand-model.joblib"
NETWORK_PATH = ROOT / "network.json"

FEATURES = [
    "base_rate",
    "time_factor",
    "scenario_mult",
    "stop_weight",
    "waiting_count",
    "avg_wait",
    "longest_wait",
    "hour_sin",
    "hour_cos",
    "is_peak",
    "expected_15",
    "hub_linked",
]


def time_of_day_factor(minutes):
    hour = ((minutes / 60) % 24 + 24) % 24
    morning = 0.72 * math.exp(-0.5 * ((hour - 8.1) / 1.25) ** 2)
    evening = 0.9 * math.exp(-0.5 * ((hour - 17.35) / 1.7) ** 2)
    midday = 0.18 * math.exp(-0.5 * ((hour - 12.7) / 2.4) ** 2)
    return 0.42 + morning + evening + midday


def is_peak(hour):
    return 1 if (7.0 <= hour <= 9.5) or (16.5 <= hour <= 19.5) else 0


def build_features(stop, scenario, sim_minutes, waiting_count, avg_wait, longest_wait):
    hour = (sim_minutes / 60) % 24
    factor = time_of_day_factor(sim_minutes + 15)
    stop_weight = scenario["stopWeights"].get(stop["id"], 1.0)
    expected15 = stop["baseRate"] * factor * scenario["arrivalMult"] * stop_weight * 15
    return [
        stop["baseRate"],
        factor,
        scenario["arrivalMult"],
        stop_weight,
        waiting_count,
        avg_wait,
        longest_wait,
        math.sin(2 * math.pi * hour / 24.0),
        math.cos(2 * math.pi * hour / 24.0),
        is_peak(hour),
        expected15,
        1.0 if stop["id"] in {"casa-voyageurs", "maarif"} else 0.0,
    ]


def main():
    parser = argparse.ArgumentParser(description="Demo inference with the Casabus ML model")
    parser.add_argument("--time", type=float, default=17.5, help="Simulation hour (0-23)")
    parser.add_argument("--scenario", choices=["normal", "rush", "stadium"], default="rush")
    parser.add_argument("--top", type=int, default=5, help="Number of stops to print")
    args = parser.parse_args()

    with open(NETWORK_PATH, encoding="utf-8") as handle:
        network = json.load(handle)
    model = joblib.load(MODEL_PATH)

    scenario = next(s for s in network["scenarios"] if s["id"] == args.scenario)
    sim_minutes = args.time * 60

    print(f"Scenario: {scenario['label']}  |  Time: {args.time:0.2f}h")
    print("-" * 56)
    results = []
    for stop in network["stops"]:
        features = build_features(stop, scenario, sim_minutes, 8, 4.2, 9.5)
        prediction = float(np.expm1(model.predict([features])[0]))
        results.append((stop["id"], stop["name"], prediction))
    results.sort(key=lambda item: item[2], reverse=True)
    for stop_id, name, prediction in results[: args.top]:
        print(f"{name:20s} ({stop_id:16s})  -> {prediction:6.1f} passengers / 30 min")
    print("-" * 56)
    print(f"Model: {MODEL_PATH.name}")


if __name__ == "__main__":
    main()
