"use client";

import type { CSSProperties } from "react";

type HappyChanProps = {
  /**
   * サイズのプリセット
   * - small: 32px
   * - medium: 64px
   * - large: 128px
   * - xl: 256px
   */
  size?: "small" | "medium" | "large" | "xl";
  /**
   * カスタムサイズ（width, height）
   */
  width?: number;
  height?: number;
  /**
   * 追加のCSSクラス
   */
  className?: string;
  /**
   * インラインスタイル
   */
  style?: CSSProperties;
  /**
   * 表情やバリエーション
   */
  variant?: "default" | "sobad" | "sad" | "standard" | "happy" | "excited";
  /**
   * alt属性
   */
  alt?: string;
};

const sizeMap = {
  small: 32,
  medium: 64,
  large: 128,
  xl: 256,
};

export function HappyChan({
  size = "medium",
  width,
  height,
  className = "",
  style,
  variant = "default",
  alt = "ハッピーちゃん",
}: HappyChanProps) {
  // サイズの決定
  const finalWidth = width ?? sizeMap[size];
  const finalHeight = height ?? sizeMap[size];

  // 画像パスの決定
  const imagePath = variant === "default" 
    ? "/happy-chan/happy.png" 
    : `/happy-chan/${variant}.png`;

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={style}
    >
      <img
        src={imagePath}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        className="object-contain"
        // 画像が読み込めない場合のフォールバック
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const fallback = target.parentElement?.querySelector(".happy-chan-fallback") as HTMLElement;
          if (fallback) {
            fallback.style.display = "flex";
          }
        }}
      />
      {/* フォールバック（画像が読み込めない場合） */}
      <div
        className="happy-chan-fallback hidden items-center justify-center text-4xl"
        style={{ width: finalWidth, height: finalHeight }}
        aria-hidden="true"
      >
        😊
      </div>
    </div>
  );
}

