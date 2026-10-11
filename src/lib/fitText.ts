// 数値の表示枠に何文字まで入るかの見積もり（設計仕様書 3.2）
// app.css の .num-cell と同じ前提（数字1文字 ≒ 0.6文字分、最小で --base の 0.6 倍まで縮小）で計算する。

/** 数字1文字の幅（em）。app.css の .num-cell と合わせる */
const CHAR_EM = 0.6
/** 文字を縮める下限（--base に対する倍率）。app.css の --min の初期値と合わせる */
const MIN_SCALE = 0.6

/**
 * 幅 widthPx の枠に、文字の大きさ baseRem（最小でその 0.6 倍）で何文字入るか。
 * まだ幅を測っていない（0）ときは制限しない。
 */
export function maxChars(widthPx: number, baseRem: number): number {
  if (widthPx <= 0) return Infinity
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return Math.floor(widthPx / (CHAR_EM * baseRem * rootPx * MIN_SCALE))
}
