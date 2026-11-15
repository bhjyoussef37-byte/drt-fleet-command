"""Train a scikit-learn Gradient Boosting forecaster and export it as JSON trees.

The exported JSON (`src/data/demand-model.json`) is consumed directly by the
front-end, so the live GitHub Pages demo can run a model trained in Python
without needing a backend.
"""
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "training-data.csv"
MODEL_JSON_PATH = ROOT.parent / "src" / "data" / "demand-model.json"
MODEL_JOBlib_PATH = ROOT / "demand-model.joblib"

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


def extract_tree(tree):
    t = tree.tree_
    return {
        "feature": [int(x) for x in t.feature.tolist()],
        "threshold": [float(x) for x in t.threshold.tolist()],
        "left": [int(x) for x in t.children_left.tolist()],
        "right": [int(x) for x in t.children_right.tolist()],
        "value": [float(np.ravel(t.value[i])[0]) for i in range(t.node_count)],
    }


def main():
    if not DATA_PATH.exists():
        raise SystemExit("Run ml/generate_data.py first.")

    frame = pd.read_csv(DATA_PATH)
    X = frame[FEATURES].to_numpy(dtype=float)
    y = frame["demand_next_30m"].to_numpy(dtype=float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = GradientBoostingRegressor(
        n_estimators=90,
        max_depth=3,
        learning_rate=0.08,
        subsample=0.9,
        min_samples_leaf=4,
        random_state=42,
    )
    model.fit(X_train, np.log1p(y_train))

    raw_pred = model.predict(X_test)
    pred = np.expm1(raw_pred)
    pred = np.clip(pred, 0, None)

    mae = float(mean_absolute_error(y_test, pred))
    rmse = float(math.sqrt(mean_squared_error(y_test, pred)))
    r2 = float(r2_score(y_test, pred))

    artifact = {
        "version": 1,
        "algorithm": "GradientBoostingRegressor",
        "target": "demand_next_30m",
        "features": FEATURES,
        "learning_rate": float(model.learning_rate),
        "init_prediction": float(np.ravel(model.init_.constant_)[0]),
        "log_target": True,
        "trees": [extract_tree(estimator[0]) for estimator in model.estimators_],
        "metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
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

    joblib.dump(model, MODEL_JOBlib_PATH)

    print("Training complete")
    print(f"  samples: {len(frame)}")
    print(f"  MAE : {mae:.2f} passengers / 30 min")
    print(f"  RMSE: {rmse:.2f}")
    print(f"  R2  : {r2:.4f}")
    print(f"  trees: {len(artifact['trees'])}")
    print(f"  wrote {MODEL_JSON_PATH}")
    print(f"  wrote {MODEL_JOBlib_PATH}")


if __name__ == "__main__":
    main()
