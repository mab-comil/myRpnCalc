// big.js のラッパ、丸め、表示用の整形（設計仕様書 4.3・3.2）
import Big from 'big.js'
import type { Num, TaxRounding, X } from './types'

/**
 * このアプリ専用の Big コンストラクタ。グローバルの Big の設定は変えない。
 * - DP: 割り算の精度は小数点以下20桁
 * - RM: 割り算などの既定の丸めは四捨五入
 * - PE/NE: toString() で指数表記にしない（保存する Num を常に普通の表記にする）
 */
export const D = Big()
D.DP = 20
D.RM = Big.roundHalfUp
D.PE = 1e6
D.NE = -1e6

export type Decimal = Big.Big

/** Num を Decimal に変換する */
export function dec(n: Num): Decimal {
  return new D(n)
}

/** Decimal を保存用の Num に変換する。-0 は 0 にそろえる */
export function toNum(d: Decimal): Num {
  return d.eq(0) ? '0' : d.toString()
}

const TAX_RM: Record<Exclude<TaxRounding, 'none'>, Big.RoundingMode> = {
  down: Big.roundDown, // 0に近い方へ
  halfUp: Big.roundHalfUp,
  up: Big.roundUp, // 0から遠い方へ
}

/** 税額を1円単位に丸める。'none' のときは丸めない */
export function roundTax(d: Decimal, mode: TaxRounding): Decimal {
  return mode === 'none' ? d : d.round(0, TAX_RM[mode])
}

/** 整数部の数字列に3桁ごとのカンマを入れる */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** "-1234.5" のような普通の表記の文字列を、符号・整数部・小数部に分けてカンマを入れる */
function groupPlain(text: string): string {
  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text
  const dot = body.indexOf('.')
  const int = dot < 0 ? body : body.slice(0, dot)
  const frac = dot < 0 ? '' : body.slice(dot)
  return (negative ? '-' : '') + groupDigits(int) + frac
}

/** 末尾の不要な0（と小数点）を取り除く。"1.2300" → "1.23"、"5.000" → "5" */
function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text
}

/** 指数表記に切り替える境目（整数部が21桁を超える） */
const EXP_THRESHOLD = new D('1e21')

/**
 * 確定値を表示用の文字列にする。
 * - 小数点以下を decimals 桁で四捨五入し、末尾の0を取り除く
 * - 3桁ごとにカンマで区切る
 * - 整数部が21桁を超えるときは指数表記（仮数部も decimals 桁までで、末尾の0を取り除く）
 */
export function formatValue(n: Num, decimals: number): string {
  const d = dec(n)
  if (d.abs().gte(EXP_THRESHOLD)) {
    const [mantissa, exp] = d.toExponential(decimals).split('e')
    return `${trimZeros(mantissa)}e${exp}`
  }
  const text = trimZeros(d.toFixed(decimals))
  return groupPlain(text === '-0' ? '0' : text)
}

/**
 * 入力中の文字列を表示用にする。末尾の "." や "0" はそのまま残す。
 * 例: "1234.50" → "1,234.50"、"-0." → "-0."
 */
export function formatInput(text: string): string {
  return groupPlain(text)
}

/**
 * 表示幅に収まるよう、小数の桁を減らして確定値を整形する（設計仕様書 3.2）。
 * decimals 桁から1桁ずつ減らし、maxChars 文字以内になった最初の表示を返す（内部の値は変えない）。
 * 小数0桁でも収まらないときは0桁の表示を返す。左側の省略は CSS（.num-cell）が行う。
 */
export function formatValueFit(n: Num, decimals: number, maxChars = Infinity): string {
  for (let d = decimals; d > 0; d--) {
    const text = formatValue(n, d)
    if (text.length <= maxChars) return text
  }
  return formatValue(n, 0)
}

/**
 * スタック0の表示（設計仕様書 3.2）。
 * 空のときは ''（負号だけ付いているときは '-'）。
 * 確定値は maxChars 文字に収まるよう小数の桁を減らす。入力中の文字列は打ったとおりに表示する。
 */
export function formatX(x: X, decimals: number, maxChars = Infinity): string {
  switch (x.kind) {
    case 'empty':
      return x.negative ? '-' : ''
    case 'input':
      return formatInput(x.text)
    case 'value':
      return formatValueFit(x.value, decimals, maxChars)
  }
}
