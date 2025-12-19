import os
from pathlib import Path
from typing import List


BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = ROOT_DIR / "data"

# CORS設定（Cookie送信を許可するため、明示的なオリジンを指定推奨）
ALLOW_ORIGINS: List[str] = os.getenv(
    "ALLOW_ORIGINS",
    "http://localhost:3000,http://172.31.3.40:3000",
).split(",")

# セッションCookie設定
SESSION_SECRET: str = os.getenv("SESSION_SECRET", "change-me-session-secret")
SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "feelance_session")
SESSION_MAX_AGE: int = int(os.getenv("SESSION_MAX_AGE", str(60 * 60 * 24 * 7)))  # 7日

