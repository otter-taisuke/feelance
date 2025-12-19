---
name: Feelance初期実装
overview: 買い物履歴＋感情スコア付き入力、Happy Money計算、カレンダー表示を備えたFeelanceの初期実装。ID入力のみの簡易認証とCSVデータ保存を行う。
todos:
  - id: design-data
    content: CSVスキーマとHappy計算式を定義
    status: completed
  - id: backend-api
    content: FastAPIで認証と記録CRUD実装（当日イベント取得・編集・作成対応）
    status: completed
    dependencies:
      - design-data
  - id: frontend-ui
    content: Next.jsで入力フォームとカレンダー表示＋日付クリック編集/作成
    status: completed
    dependencies:
      - backend-api
  - id: validation-test
    content: 入力バリデーションとE2E動作確認
    status: completed
    dependencies:
      - frontend-ui
---

# Feelance実装プラン

## ゴール

- ID入力のみの簡易認証（管理者が `data/users.csv` に登録したIDで利用）
- 記入: 商品名・金額・心の動き（5段階: -2〜+2）を登録
- Happy Money表示: 心の動きで0.5〜1.5倍にクランプした補正金額を計算・表示
- カレンダーで過去記録を表示し、任意日クリックで当日イベントの編集・作成（FullCalendar使用）

## 変更対象

- バックエンド: `backend/` 内にFastAPIエンドポイント追加（記録CRUD, Happy計算ロジック, CSV永続化）
- データ: `data/transactions.csv`, `data/users.csv` を読書き