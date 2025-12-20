# Feelance 開発ガイド

アプリ（FastAPI + Next.js）をローカルで起動する手順と、環境変数の設定例をまとめました。

## 必要環境
- Python 3.14 以上
- Node.js 20 系以上 + pnpm
- OpenAI API キー（ハッピーちゃんの対話生成で使用）

## リポジトリ構成
- `backend/` … FastAPI サーバー（CSV 永続化）
- `frontend/` … Next.js 16 アプリ

## 環境変数サンプル
### backend/.env
```
OPENAI_API_KEY=sk-********                   # 必須: OpenAI キー
OPENAI_MODEL=gpt-4o-mini                    # 任意: 利用モデル
```

### frontend/.env.local
```
NEXT_PUBLIC_API_BASE=http://localhost:8000   # バックエンドのベース URL
```

## セットアップ & 実行
### バックエンド（FastAPI）
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate           # PowerShell の例（macOS/Linux は source .venv/bin/activate）
pip install -e .                 # uv/pip どちらでも可
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- `backend/data/` 配下の CSV は初回起動時に自動生成されます。
- ヘルスチェック: `GET http://localhost:8000/health`

### フロントエンド（Next.js）
```bash
cd frontend
pnpm install
pnpm dev    # http://localhost:3000
```
- API ベース URL は `.env.local` の `NEXT_PUBLIC_API_BASE` を参照します。

## よくあるトラブル
- OpenAI キー未設定: 日記生成/チャットで 500 エラーになります。`backend/.env` を確認してください。
- CORS エラー: `ALLOW_ORIGINS` にフロント URL を追加してください（カンマ区切り）。

