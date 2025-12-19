from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[3]
CONFIG_PATH = PROJECT_ROOT / "frontend" / "config" / "mood.json"

_DEFAULT_MAP: Dict[int, str] = {
    -2: "最悪",
    -1: "やや悪",
    0: "普通",
    1: "やや良",
    2: "最高",
}
_DEFAULT_LABEL = "不明"

def _load_config() -> Dict[int, str]:
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        moods = data.get("moods", [])
        mapping = {int(item["value"]): item.get("short_label") or item.get("label") for item in moods if "value" in item}
        return {k: v for k, v in mapping.items() if v}
    except Exception:
        return {}

_CONFIG_MAP = _load_config()
_LABEL_MAP: Dict[int, str] = {**_DEFAULT_MAP, **_CONFIG_MAP}
_FALLBACK_LABEL = _DEFAULT_LABEL

def get_mood_label(score: Optional[int]) -> str:
    try:
        key = int(score) if score is not None else None
    except Exception:
        key = None
    return _LABEL_MAP.get(key, _FALLBACK_LABEL)

