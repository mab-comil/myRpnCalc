// localStorage への保存と読み込み（設計仕様書 6章）
// 読み込んだデータは信用せず、形を検査してから使う。読み書きの失敗はすべて無視する。
import { DEFAULT_SETTINGS, MAX_DIGITS, MAX_HISTORY, initialState } from '../core/engine'
import type { CalcState, HistoryLine, Num, Settings, X } from '../core/types'

export const STATE_KEY = 'myRpnCalc.state.v1'
export const SETTINGS_KEY = 'myRpnCalc.settings.v1'

/** localStorage と同じ形のもの（テストでは差し替える） */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/** ブラウザの localStorage。使えない環境（プライベートモードの一部、Node など）では null */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readJSON(storage: StorageLike | null, key: string): unknown {
  try {
    const text = storage?.getItem(key)
    return text == null ? undefined : JSON.parse(text)
  } catch {
    return undefined
  }
}

export function writeJSON(storage: StorageLike | null, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value))
  } catch {
    // 容量オーバーなどは無視して動き続ける
  }
}

// ---- 形の検査 -------------------------------------------------------------------

const NUM_RE = /^-?\d+(\.\d+)?$/
const INPUT_RE = /^-?\d+(\.\d*)?$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNum(v: unknown): v is Num {
  return typeof v === 'string' && NUM_RE.test(v)
}

function isX(v: unknown): v is X {
  if (!isRecord(v)) return false
  switch (v.kind) {
    case 'empty':
      return typeof v.negative === 'boolean'
    case 'input':
      return typeof v.text === 'string' && INPUT_RE.test(v.text) && v.text.replace(/\D/g, '').length <= MAX_DIGITS
    case 'value':
      return isNum(v.value)
    default:
      return false
  }
}

function isHistoryLine(v: unknown): v is HistoryLine {
  if (!isRecord(v)) return false
  if (v.type === 'separator') return true
  return (
    v.type === 'op' &&
    Array.isArray(v.cells) &&
    v.cells.length === 4 &&
    v.cells.every((c) => c === null || isNum(c)) &&
    typeof v.overflow === 'boolean' &&
    typeof v.label === 'string'
  )
}

/** 保存されていた計算状態を検査する。少しでもおかしければ初期状態にする */
export function parseCalcState(raw: unknown): CalcState {
  if (
    !isRecord(raw) ||
    !isX(raw.x) ||
    !Array.isArray(raw.stack) ||
    !raw.stack.every(isNum) ||
    !Array.isArray(raw.history) ||
    !raw.history.every(isHistoryLine)
  ) {
    return initialState()
  }
  return { x: raw.x, stack: raw.stack, history: raw.history.slice(-MAX_HISTORY) }
}

/** 0以上の税率か */
export function isTaxRate(v: unknown): v is Num {
  return isNum(v) && !v.startsWith('-')
}

/** 小数の表示桁数（0〜15 の整数）か */
export function isDecimals(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 15
}

/** 保存されていた設定を検査する。おかしい項目だけ初期値に戻す */
export function parseSettings(raw: unknown): Settings {
  const r = isRecord(raw) ? raw : {}
  const d = DEFAULT_SETTINGS
  return {
    taxRate1: isTaxRate(r.taxRate1) ? r.taxRate1 : d.taxRate1,
    taxRate2: isTaxRate(r.taxRate2) ? r.taxRate2 : d.taxRate2,
    taxRounding: ['down', 'halfUp', 'up', 'none'].includes(r.taxRounding as string)
      ? (r.taxRounding as Settings['taxRounding'])
      : d.taxRounding,
    decimals: isDecimals(r.decimals) ? r.decimals : d.decimals,
    theme: ['auto', 'light', 'dark'].includes(r.theme as string) ? (r.theme as Settings['theme']) : d.theme,
  }
}
