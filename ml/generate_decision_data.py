"""Generate imitation-learning data for the dispatch decision model.

Each row describes one (bus, stop) candidate pair. The label is the heuristic
dispatch cost (lower is better), so the neural network learns to rank buses the
same way the optimizer does.
"""
import json
import math
import random
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
NETWORK_PATH = ROOT / "network.json"
OUTPUT_PATH = ROOT / "decision-data.csv"
SEED = 20260416
SAMPLES = 12000


def time_of_day_factor(minutes):
    hour = ((minutes / 60) % 24 + 24) % 24
    morning = 0.72 * math.exp(-0.5 * ((hour - 8.1) / 1.25) ** 2)
    evening = 0.9 * math.exp(-0.5 * ((hour - 17.35) / 1.7) ** 2)
    midday = 0.18 * math.exp(-0.5 * ((hour - 12.7) / 2.4) ** 2)
    return 0.42 + morning + evening + midday


def hop_distance_placeholder():
    # Filled per pair from the network adjacency below.
    return None


def main():
    random.seed(SEED)
    np.random.seed(SEED)

    with open(NETWORK_PATH, encoding="utf-8") as handle:
        network = json.load(handle)

    stops = {s["id"]: s for s in network["stops"]}
    stop_list = network["stops"]
    scenarios = network["scenarios"]

    # Build adjacency for hop distance.
    # Reconstruct from the same edge list used by the front-end.
    edges = [
        ["casa-port", "anfa"], ["casa-port", "maarif"], ["casa-port", "habous"],
        ["anfa", "ain-diab"], ["anfa", "maarif"], ["ain-diab", "hay-hassani"],
        ["maarif", "habous"], ["maarif", "casa-voyageurs"], ["habous", "casa-voyageurs"],
        ["habous", "hay-hassani"], ["casa-voyageurs", "ain-sebaa"],
        ["casa-voyageurs", "oasis"], ["casa-voyageurs", "hay-hassani"],
        ["hay-hassani", "oasis"], ["ain-sebaa", "sidi-moumen"], ["oasis", "sidi-moumen"],
    ]
    adjacency = {sid: [] for sid in stops}
    for a, b in edges:
        adjacency[a].append(b)
        adjacency[b].append(a)

    def bfs(start, end):
        if start == end:
            return 0
        seen = {start}
        queue = [(start, 0)]
        while queue:
            cur, d = queue.pop(0)
            for nb in adjacency.get(cur, []):
                if nb == end:
                    return d + 1
                if nb not in seen:
                    seen.add(nb)
                    queue.append((nb, d + 1))
        return 6

    rows = []
    for _ in range(SAMPLES):
        scenario = random.choices(scenarios, weights=[0.58, 0.27, 0.15], k=1)[0]
        sim_minutes = random.uniform(5 * 60, 23.5 * 60)
        factor = time_of_day_factor(sim_minutes)
        hour = (sim_minutes / 60) % 24

        # Pick a hotspot target stop.
        target_stop = random.choices(
            stop_list, weights=[s["baseRate"] for s in stop_list], k=1
        )[0]

        # Random active fleet.
        n_active = random.randint(4, 8)
        buses = []
        for i in range(n_active):
            bus_stop = random.choice(stop_list)
            buses.append(
                {
                    "id": f"B{i}",
                    "progress": round(random.random(), 3),
                    "onboard": random.randint(0, 6),
                    "capacity": 8,
                    "to": bus_stop["id"],
                    "target": random.choice([None, target_stop["id"]]) if random.random() < 0.35 else None,
                }
            )

        waiting = random.randint(0, 40)
        waits = np.random.exponential(scale=3.5, size=waiting) if waiting else np.array([])
        avg_wait = float(waits.mean()) if waits.size else 0.0
        longest_wait = float(waits.max()) if waits.size else 0.0

        predicted = (
            target_stop["baseRate"]
            * time_of_day_factor(sim_minutes + 15)
            * scenario["arrivalMult"]
            * scenario["stopWeights"].get(target_stop["id"], 1.0)
            * 30
        )
        hub_linked = 1.0 if target_stop["id"] in {"casa-voyageurs", "maarif"} else 0.0

        assigned_count = sum(1 for b in buses if b["target"] == target_stop["id"])

        for bus in buses:
            progress = bus["progress"]
            hop = bfs(bus["to"], target_stop["id"])
            cost = hop + (1.0 - progress) - (0.9 if bus["target"] == target_stop["id"] else 0.0)
            rows.append(
                {
                    "bus_progress": progress,
                    "bus_onboard": bus["onboard"],
                    "bus_capacity": bus["capacity"],
                    "hop_distance": hop,
                    "eta_minutes": (hop + (1.0 - progress)) * 2.15,
                    "stop_waiting": waiting,
                    "stop_avg_wait": avg_wait,
                    "stop_longest_wait": longest_wait,
                    "predicted_demand": predicted,
                    "assigned_count": assigned_count,
                    "scenario_mult": scenario["arrivalMult"],
                    "time_factor": factor,
                    "hub_linked": hub_linked,
                    "cost": cost,
                }
            )

    frame = pd.DataFrame(rows)
    frame.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote {len(frame)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
