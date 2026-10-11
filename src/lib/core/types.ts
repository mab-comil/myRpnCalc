// 計算エンジンの型定義（設計仕様書 4.1）

/** 確定値。big.js で解釈できる十進数の文字列（指数表記は使わない） */
export type Num = string

/** スタック0（X レジスタ）の状態 */
export type X =
  | { kind: 'empty'; negative: boolean } // 空（＋/− で負号だけ付けた状態を含む）
  | { kind: 'input'; text: string } // 入力中の文字列 例: "-12.30"。"" や "-" にはならない
  | { kind: 'value'; value: Num } // 演算結果・複製値など確定した値

export interface HistoryLine {
  type: 'op' | 'separator'
  cells?: [Num | null, Num | null, Num | null, Num | null] // st3, st2, st1, st0（null は空）
  overflow?: boolean // スタック4以降に値があったか
  label?: string // '＋' '−' '✕' '÷' '外10%' など
}

export interface CalcState {
  x: X // スタック0
  stack: Num[] // stack[0] = スタック1, stack[1] = スタック2, …（深さは無制限）
  history: HistoryLine[]
}

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
export type BinaryOp = 'add' | 'sub' | 'mul' | 'div'
export type TaxKey = 'taxOut1' | 'taxIn1' | 'taxOut2' | 'taxIn2'

/** 電卓のキー。テンキー部の各ボタンと物理キーボードはこれに変換してエンジンへ渡す */
export type Key =
  | Digit
  | '00'
  | '.'
  | 'clear' // C
  | 'back' // ⌫
  | 'negate' // ＋/−
  | 'enter'
  | BinaryOp
  | TaxKey

/** 税額の端数処理（設計仕様書 3.5・4.3） */
export type TaxRounding = 'down' | 'halfUp' | 'up' | 'none'

export type Theme = 'auto' | 'light' | 'dark'

/** 設定（設計仕様書 3.5） */
export interface Settings {
  taxRate1: Num // 税率1（%）
  taxRate2: Num // 税率2（%）
  taxRounding: TaxRounding
  decimals: number // 小数の表示桁数（0〜15）
  theme: Theme
}

export interface ReduceResult {
  state: CalcState
  error?: string
}
