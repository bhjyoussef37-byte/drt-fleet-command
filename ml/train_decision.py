"""Train a small neural network (MLP) for dispatch decisions and export weights."""
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "decision-data.csv"
MODEL_JSON_PATH = ROOT.parent / "src" / "data" / "decision-model.json"
MODEL_JOBlib_PATH = ROOT / "decision-model.joblib"

FEATURES = [
    "bus_progress",
    "bus_onboard",
    "bus_capacity",
    "hop_distance",
    "eta_minutes",
    "stop_waiting",
    "stop_avg_wait",
    "stop_longest_wait",
    "predicted_demand",
    "assigned_count",
    "scenario_mult",
    "time_factor",
    "hub_linked",
]


def main():
    if not DATA_PATH.exists():
        raise SystemExit("Run ml/generate_decision_data.py first.")

    frame = pd.read_csv(DATA_PATH)
    X = frame[FEATURES].to_numpy(dtype=float)
    y = frame["cost"].to_numpy(dtype=float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = MLPRegressor(
        hidden_layer_sizes=(32, 16),
        activation="relu",
        solver="adam",
        max_iter=400,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
    )
    model.fit(X_train_scaled, y_train)

    pred = model.predict(X_test_scaled)
    mae = float(mean_absolute_error(y_test, pred))
    r2 = float(r2_score(y_test, pred))

    layers = []
    for weights, bias in zip(model.coefs_, model.intercepts_):
        layers.append(
            {
                "weights": [[float(v) for v in row] for row in weights.tolist()],
                "bias": [float(v) for v in bias.tolist()],
            }
        )

    artifact = {
        "version": 1,
        "type": "MLPRegressor",
        "features": FEATURES,
        "scaler": {
            "mean": [float(v) for v in scaler.mean_.tolist()],
            "scale": [float(v) for v in scaler.scale_.tolist()],
        },
        "activation": "relu",
        "output_activation": "identity",
        "layers": layers,
        "metrics": {
            "mae": round(mae, 4),
            "r2": round(r2, 4),
            "samples": int(len(frame)),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    MODEL_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_JSON_PATH, "w", encoding="utf-8") as handle:
        json.dump(artifact, handle)

    joblib.dump((scaler, model), MODEL_JOBlib_PATH)

    print("Decision model training complete")
    print(f"  samples: {len(frame)}")
    print(f"  MAE : {mae:.4f}")
    print(f"  R2  : {r2:.4f}")
    print(f"  layers: {[ (l['weights'].__len__(), l['weights'][0].__len__()) for l in layers]}")
    print(f"  wrote {MODEL_JSON_PATH}")
    print(f"  wrote {MODEL_JOBlib_PATH}")


if __name__ == "__main__":
    main()
