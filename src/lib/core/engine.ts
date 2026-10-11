// 計算エンジン（設計仕様書 4章）
// reduce(state, key, settings) は純粋関数。引数の state は変更せず、新しい state を返す。
import { dec, roundTax, toNum, type Decimal } from './number'
import type { BinaryOp, CalcState, Digit, HistoryLine, Key, Num, ReduceResult, Settings, TaxKey, X } from './types'

/** 入力できる最大桁数（整数部と小数部の合計） */
export const MAX_DIGITS = 15
/** 保存する履歴の最大行数 */
export const MAX_HISTORY = 1000

export const ERROR_OPERAND = '数値が足りません'
export const ERROR_DIV_ZERO = '0で割れません'

export const DEFAULT_SETTINGS: Settings = {
  taxRate1: '10',
  taxRate2: '8',
  taxRounding: 'down',
  decimals: 10,
  theme: 'auto',
}

const EMPTY: X = { kind: 'empty', negative: false }

export function initialState(): CalcState {
  return { x: EMPTY, stack: [], history: [] }
}

/** スタック0の値。空のときは null */
export function xToNum(x: X): Num | null {
  switch (x.kind) {
    case 'empty':
      return null
    case 'input':
      return toNum(dec(x.text))
    case 'value':
      return x.value
  }
}

/** 税キーの税率と種類 */
function taxInfo(key: TaxKey, settings: Settings): { rate: Num; inclusive: boolean } {
  switch (key) {
    case 'taxOut1':
      return { rate: settings.taxRate1, inclusive: false }
    case 'taxIn1':
      return { rate: settings.taxRate1, inclusive: true }
    case 'taxOut2':
      return { rate: settings.taxRate2, inclusive: false }
    case 'taxIn2':
      return { rate: settings.taxRate2, inclusive: true }
  }
}

const OP_LABEL: Record<BinaryOp, string> = { add: '＋', sub: '−', mul: '✕', div: '÷' }

/** キーのラベル（履歴の演算子欄・テンキーの表示に使う）。例: '＋'、'外10%' */
export function keyLabel(key: BinaryOp | TaxKey, settings: Settings): string {
  if (key in OP_LABEL) return OP_LABEL[key as BinaryOp]
  const { rate, inclusive } = taxInfo(key as TaxKey, settings)
  return `${inclusive ? '内' : '外'}${toNum(dec(rate))}%`
}

export function reduce(state: CalcState, key: Key, settings: Settings): ReduceResult {
  switch (key) {
    case 'clear':
      return { state: clear(state) }
    case 'back':
      return { state: back(state) }
    case 'negate':
      return { state: negate(state) }
    case 'enter':
      return { state: enter(state) }
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
      return binary(state, key)
    case 'taxOut1':
    case 'taxIn1':
    case 'taxOut2':
    case 'taxIn2':
      return { state: tax(state, key, settings) }
    default:
      return { state: input(state, key) }
  }
}

// ---- 数字・00・. --------------------------------------------------------------

function countDigits(text: string): number {
  return text.replace(/[^0-9]/g, '').length
}

function input(state: CalcState, key: Digit | '00' | '.'): CalcState {
  const { x } = state
  if (x.kind === 'value') {
    // 自動 Enter: 確定値をスタック1へ送り、新しい入力を始める
    return input({ ...state, x: EMPTY, stack: [x.value, ...state.stack] }, key)
  }
  if (x.kind === 'empty') {
    const sign = x.negative ? '-' : ''
    const start = key === '.' ? '0.' : key === '00' ? '0' : key
    return { ...state, x: { kind: 'input', text: sign + start } }
  }

  const text = x.text
  const sign = text.startsWith('-') ? '-' : ''
  const body = sign ? text.slice(1) : text
  let next: string
  if (key === '.') {
    if (body.includes('.')) return state
    next = text + '.'
  } else if (body === '0') {
    // 先頭の余分な0は付けない
    next = sign + (key === '00' ? '0' : key)
  } else {
    next = text + key
  }
  if (countDigits(next) > MAX_DIGITS) return state
  return next === text ? state : { ...state, x: { kind: 'input', text: next } }
}

// ---- C・⌫・＋/−・Enter ----------------------------------------------------------

function clear(state: CalcState): CalcState {
  if (state.x.kind !== 'empty' || state.x.negative) return { ...state, x: EMPTY }
  // 全消去（AC）。履歴が空のときや、直前がすでに区切り線のときは区切り線を重ねない
  const last = state.history.at(-1)
  const history =
    last === undefined || last.type === 'separator' ? state.history : addHistory(state.history, { type: 'separator' })
  return { x: EMPTY, stack: [], history }
}

function back(state: CalcState): CalcState {
  const { x } = state
  if (x.kind === 'input') {
    const next = x.text.slice(0, -1)
    if (next === '') return { ...state, x: EMPTY }
    if (next === '-') return { ...state, x: { kind: 'empty', negative: true } }
    return { ...state, x: { kind: 'input', text: next } }
  }
  if (x.kind === 'empty' && x.negative) return { ...state, x: EMPTY }
  return state
}

function negate(state: CalcState): CalcState {
  const { x } = state
  switch (x.kind) {
    case 'empty':
      return { ...state, x: { kind: 'empty', negative: !x.negative } }
    case 'input':
      return { ...state, x: { kind: 'input', text: x.text.startsWith('-') ? x.text.slice(1) : '-' + x.text } }
    case 'value':
      return { ...state, x: { kind: 'value', value: toNum(dec(x.value).neg()) } }
  }
}

function enter(state: CalcState): CalcState {
  const value = xToNum(state.x)
  if (value !== null) return { ...state, x: EMPTY, stack: [value, ...state.stack] }
  // 空のときはスタック1を複製する
  if (state.stack.length === 0) return state
  return { ...state, x: { kind: 'value', value: state.stack[0] } }
}

// ---- 演算 ----------------------------------------------------------------------

/**
 * 演算に使うスタック0の値と、残りのスタックを取り出す。
 * スタック0が空なら捨てて、スタック1を下ろす。値がなければ null。
 */
function takeX(state: CalcState): { x: Decimal; rest: Num[] } | null {
  const value = xToNum(state.x)
  if (value !== null) return { x: dec(value), rest: state.stack }
  if (state.stack.length === 0) return null
  return { x: dec(state.stack[0]), rest: state.stack.slice(1) }
}

/** 演算直前の状態（表示どおり）と演算子から履歴の1行を作る */
function opLine(state: CalcState, label: string): HistoryLine {
  const s = state.stack
  return {
    type: 'op',
    cells: [s[2] ?? null, s[1] ?? null, s[0] ?? null, xToNum(state.x)],
    overflow: s.length > 3,
    label,
  }
}

function addHistory(history: HistoryLine[], line: HistoryLine): HistoryLine[] {
  const next = [...history, line]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

function binary(state: CalcState, op: BinaryOp): ReduceResult {
  const taken = takeX(state)
  if (taken === null || taken.rest.length === 0) return { state, error: ERROR_OPERAND }
  const { x, rest } = taken
  if (op === 'div' && x.eq(0)) return { state, error: ERROR_DIV_ZERO }

  const y = dec(rest[0])
  const result = op === 'add' ? y.plus(x) : op === 'sub' ? y.minus(x) : op === 'mul' ? y.times(x) : y.div(x)
  return {
    state: {
      x: { kind: 'value', value: toNum(result) },
      stack: rest.slice(1),
      history: addHistory(state.history, opLine(state, OP_LABEL[op])),
    },
  }
}

function tax(state: CalcState, key: TaxKey, settings: Settings): CalcState {
  const taken = takeX(state)
  if (taken === null) return state
  const { x: base, rest } = taken
  const { rate, inclusive } = taxInfo(key, settings)
  // 内税は b × r ÷ (100 + r)。誤差を減らすため掛け算を先に行う
  const raw = base.times(rate).div(inclusive ? dec(rate).plus(100) : 100)
  return {
    x: { kind: 'value', value: toNum(roundTax(raw, settings.taxRounding)) },
    stack: [toNum(base), ...rest],
    history: addHistory(state.history, opLine(state, keyLabel(key, settings))),
  }
}
