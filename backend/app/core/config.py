from pathlib import Path
from typing import List


BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = ROOT_DIR / "data"

# 簡易CORS設定（必要に応じて環境変数化）
ALLOW_ORIGINS: List[str] = ["*"]

