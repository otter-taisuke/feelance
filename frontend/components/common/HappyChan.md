# HappyChan コンポーネント

ハッピーちゃんキャラクターを表示する再利用可能なコンポーネントです。

## セットアップ

1. 画像ファイルを `frontend/public/happy-chan.png` に配置してください
2. 必要に応じて、バリエーション画像を `frontend/public/happy-chan/` ディレクトリに配置できます
   - `happy-chan/happy.png`
   - `happy-chan/sad.png`
   - `happy-chan/excited.png`

## 使用方法

### 基本的な使用

```tsx
import { HappyChan } from "@/components/common/HappyChan";

// デフォルトサイズ（medium: 64px）
<HappyChan />

// サイズ指定
<HappyChan size="small" />   // 32px
<HappyChan size="medium" />  // 64px
<HappyChan size="large" />   // 128px
<HappyChan size="xl" />      // 256px

// カスタムサイズ
<HappyChan width={100} height={100} />

// スタイル追加
<HappyChan size="large" className="animate-bounce" />

// バリエーション（将来的に複数画像に対応）
<HappyChan variant="happy" />
<HappyChan variant="sad" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"small" \| "medium" \| "large" \| "xl"` | `"medium"` | サイズのプリセット |
| `width` | `number` | `undefined` | カスタム幅（px） |
| `height` | `number` | `undefined` | カスタム高さ（px） |
| `className` | `string` | `""` | 追加のCSSクラス |
| `style` | `CSSProperties` | `undefined` | インラインスタイル |
| `variant` | `"default" \| "happy" \| "sad" \| "excited"` | `"default"` | 表情やバリエーション |
| `alt` | `string` | `"ハッピーちゃん"` | alt属性 |

## 使用例

### ヘッダーに表示
```tsx
<HappyChan size="small" />
```

### 空状態に表示
```tsx
<div className="flex flex-col items-center gap-3">
  <HappyChan size="medium" />
  <p>まだ登録がありません</p>
</div>
```

### 成功メッセージに表示
```tsx
<div className="flex items-center gap-2">
  <HappyChan size="small" variant="happy" />
  <p>保存しました！</p>
</div>
```

## フォールバック

画像が読み込めない場合、自動的に絵文字（😊）が表示されます。

