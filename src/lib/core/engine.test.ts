import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  ERROR_DIV_ZERO,
  ERROR_OPERAND,
  MAX_HISTORY,
  initialState,
  keyLabel,
  reduce,
  xToNum,
} from './engine'
import { formatValue } from './number'
import type { CalcState, Key, Settings, X } from './types'

/**
 * キー操作を順に実行する。
 * '123.4' のような数字の並びは1文字ずつのキーに分け、'00' はそのまま1つのキーとして扱う。
 */
function run(keys: string, settings: Settings = DEFAULT_SETTINGS, start: CalcState = initialState()) {
  let state = start
  let error: string | undefined
  for (const token of keys.split(/\s+/).filter(Boolean)) {
    const list: Key[] = token === '00' || !/^[0-9.]+$/.test(token) ? [token as Key] : ([...token] as Key[])
    for (const key of list) {
      const result = reduce(state, key, settings)
      state = result.state
      error = result.error
    }
  }
  return { state, error, x: xToNum(state.x), s1: state.stack[0] }
}

const input = (text: string): X => ({ kind: 'input', text })
const value = (v: string): X => ({ kind: 'value', value: v })
const empty = (negative = false): X => ({ kind: 'empty', negative })

describe('設計仕様書 9章のテスト観点', () => {
  it('#1 123 Enter 456 + → 579', () => {
    const r = run('123 enter 456 add')
    expect(r.x).toBe('579')
    expect(r.state.stack).toEqual([])
  })

  it('#2 123 Enter 456 + 2 ✕ → 1158（自動 Enter）', () => {
    const r = run('123 enter 456 add 2 mul')
    expect(r.x).toBe('1158')
    expect(r.state.stack).toEqual([])
  })

  it('#3 100 Enter 200 Enter + → 300（空の x を捨てる）', () => {
    const r = run('100 enter 200 enter add')
    expect(r.x).toBe('300')
    expect(r.state.stack).toEqual([])
  })

  it('#4 100 Enter Enter + → 200（空のときの Enter で複製）', () => {
    const r = run('100 enter enter add')
    expect(r.x).toBe('200')
    expect(r.state.stack).toEqual([])
  })

  it('#5 0.1 Enter 0.2 + → 0.3', () => {
    expect(run('0.1 enter 0.2 add').x).toBe('0.3')
  })

  it('#6 1000 外10% + → 1100', () => {
    expect(run('1000 taxOut1 add').x).toBe('1100')
  })

  it('#7 1100 内10% − → 1000', () => {
    expect(run('1100 taxIn1 sub').x).toBe('1000')
  })

  it('#8 999 外10%（切り捨て）→ 99 / 999', () => {
    const r = run('999 taxOut1')
    expect(r.x).toBe('99')
    expect(r.s1).toBe('999')
  })

  it('#9 999 外10%（四捨五入／切り上げ）→ 100 / 999', () => {
    for (const taxRounding of ['halfUp', 'up'] as const) {
      const r = run('999 taxOut1', { ...DEFAULT_SETTINGS, taxRounding })
      expect(r.x).toBe('100')
      expect(r.s1).toBe('999')
    }
  })

  it('#10 10 Enter 3 ÷ → 表示は 3.3333333333', () => {
    const r = run('10 enter 3 div')
    expect(formatValue(r.x!, DEFAULT_SETTINGS.decimals)).toBe('3.3333333333')
  })

  it('#11 5 Enter 0 ÷ → エラー。x=0、s1=5 のまま', () => {
    const before = run('5 enter 0').state
    const r = run('div', DEFAULT_SETTINGS, before)
    expect(r.error).toBe(ERROR_DIV_ZERO)
    expect(r.state).toBe(before)
    expect(r.x).toBe('0')
    expect(r.s1).toBe('5')
    expect(r.state.history).toEqual([])
  })

  it('#12 ± 5 → -5', () => {
    const r = run('negate 5')
    expect(r.state.x).toEqual(input('-5'))
  })

  it('#13 12 ⌫ ⌫ → x が空', () => {
    expect(run('12 back back').state.x).toEqual(empty())
  })

  it('#14 C（入力中）→ C: x を消去 → 全消去＋区切り線', () => {
    const before = run('100 enter 5 add 7')
    const once = run('clear', DEFAULT_SETTINGS, before.state)
    expect(once.state.x).toEqual(empty())
    expect(once.state.stack).toEqual(['105'])
    expect(once.state.history.at(-1)?.type).toBe('op')

    const twice = run('clear', DEFAULT_SETTINGS, once.state)
    expect(twice.state.x).toEqual(empty())
    expect(twice.state.stack).toEqual([])
    expect(twice.state.history.at(-1)).toEqual({ type: 'separator' })
  })

  it('#15 5 +（スタック1が空）→ エラー。状態は変わらない', () => {
    const before = run('5').state
    const r = run('add', DEFAULT_SETTINGS, before)
    expect(r.error).toBe(ERROR_OPERAND)
    expect(r.state).toBe(before)
  })

  it('#16 スタックに5段以上積む → 履歴に overflow', () => {
    const r = run('1 enter 2 enter 3 enter 4 enter 5 add')
    expect(r.state.history[0]).toEqual({
      type: 'op',
      cells: ['2', '3', '4', '5'],
      overflow: true,
      label: '＋',
    })
  })
})

describe('数字の入力', () => {
  it('先頭の余分な0は付けない', () => {
    expect(run('0 5').state.x).toEqual(input('5'))
    expect(run('0 00').state.x).toEqual(input('0'))
    expect(run('00').state.x).toEqual(input('0'))
    expect(run('00 3').state.x).toEqual(input('3'))
    expect(run('negate 0 7').state.x).toEqual(input('-7'))
  })

  it('小数点のあとの0は残す', () => {
    expect(run('0.0 00').state.x).toEqual(input('0.000'))
    expect(run('1.50').state.x).toEqual(input('1.50'))
  })

  it('空のときの . は 0. から始める', () => {
    expect(run('.').state.x).toEqual(input('0.'))
    expect(run('negate .').state.x).toEqual(input('-0.'))
  })

  it('. は1回だけ', () => {
    expect(run('1.2.3').state.x).toEqual(input('1.23'))
  })

  it('15桁を超える入力は無視する', () => {
    expect(run('123456789012345 6').state.x).toEqual(input('123456789012345'))
    expect(run('1234567890.12345 6').state.x).toEqual(input('1234567890.12345'))
    // 00 で1桁だけ余る場合も、00 全体を無視する
    expect(run('12345678901234 00').state.x).toEqual(input('12345678901234'))
    // 負号と小数点は桁数に数えない
    expect(run('negate 12345678901234.5').state.x).toEqual(input('-12345678901234.5'))
  })

  it('演算結果のあとに数字を押すと自動 Enter', () => {
    const r = run('2 enter 3 add 7')
    expect(r.state.x).toEqual(input('7'))
    expect(r.state.stack).toEqual(['5'])
  })

  it('演算結果のあとに . を押すと自動 Enter して 0. から始める', () => {
    const r = run('2 enter 3 add .')
    expect(r.state.x).toEqual(input('0.'))
    expect(r.state.stack).toEqual(['5'])
  })
})

describe('C', () => {
  it('負号だけの状態を消す', () => {
    expect(run('negate clear').state.x).toEqual(empty())
  })

  it('確定値を消す（スタックは残る）', () => {
    const r = run('1 enter 2 add 9 enter 3 mul clear')
    expect(r.state.x).toEqual(empty())
    expect(r.state.stack).toEqual(['3'])
  })

  it('履歴が空のとき・直前が区切り線のときは区切り線を重ねない', () => {
    expect(run('clear').state.history).toEqual([])
    const r = run('1 enter 2 add clear clear clear clear')
    expect(r.state.history.map((l) => l.type)).toEqual(['op', 'separator'])
  })
})

describe('⌫', () => {
  it('入力中は末尾の1文字を消す', () => {
    expect(run('1.5 back').state.x).toEqual(input('1.'))
    expect(run('1.5 back back').state.x).toEqual(input('1'))
  })

  it('負号だけが残ったら、負号付きの空にする', () => {
    expect(run('negate 5 back').state.x).toEqual(empty(true))
  })

  it('負号付きの空なら負号を消す', () => {
    expect(run('negate back').state.x).toEqual(empty())
  })

  it('確定値・空のときは何もしない', () => {
    const v = run('1 enter 2 add').state
    expect(run('back', DEFAULT_SETTINGS, v).state).toBe(v)
    const e = run('1 enter').state
    expect(run('back', DEFAULT_SETTINGS, e).state).toBe(e)
  })
})

describe('＋/−', () => {
  it('空のときは負号を切り替える', () => {
    expect(run('negate').state.x).toEqual(empty(true))
    expect(run('negate negate').state.x).toEqual(empty())
  })

  it('入力中は先頭の - を付け外しする', () => {
    expect(run('12 negate').state.x).toEqual(input('-12'))
    expect(run('12 negate negate').state.x).toEqual(input('12'))
  })

  it('確定値は正負を反転する', () => {
    expect(run('1 enter 2 add negate').state.x).toEqual(value('-3'))
    expect(run('1 enter 1 sub negate').state.x).toEqual(value('0'))
  })
})

describe('Enter', () => {
  it('入力中の値は正規化して push する', () => {
    expect(run('12.50 enter').state.stack).toEqual(['12.5'])
    expect(run('3. enter').state.stack).toEqual(['3'])
    expect(run('negate 0 enter').state.stack).toEqual(['0'])
  })

  it('スタックがすべて空なら何もしない', () => {
    const r = run('enter')
    expect(r.state).toEqual(initialState())
  })

  it('負号付きの空でも、スタック1を複製する', () => {
    const r = run('5 enter negate enter')
    expect(r.state.x).toEqual(value('5'))
    expect(r.state.stack).toEqual(['5'])
  })
})

describe('四則演算', () => {
  it('s1 op x の順で計算する', () => {
    expect(run('10 enter 3 sub').x).toBe('7')
    expect(run('10 enter 4 div').x).toBe('2.5')
    expect(run('1.5 enter 4 mul').x).toBe('6')
  })

  it('スタックの残りは1段下がる', () => {
    const r = run('1 enter 2 enter 3 enter 4 add')
    expect(r.x).toBe('7')
    expect(r.state.stack).toEqual(['2', '1'])
  })

  it('x が空でスタックが1段だけならエラー', () => {
    const before = run('5 enter').state
    const r = run('add', DEFAULT_SETTINGS, before)
    expect(r.error).toBe(ERROR_OPERAND)
    expect(r.state).toBe(before)
  })

  it('x が空で0を割ろうとしてもエラー（下ろした値で判定）', () => {
    const before = run('5 enter 0 enter').state
    const r = run('div', DEFAULT_SETTINGS, before)
    expect(r.error).toBe(ERROR_DIV_ZERO)
    expect(r.state).toBe(before)
  })

  it('履歴には演算直前の表示（x が空なら空のまま）を記録する', () => {
    const r = run('100 enter 200 enter add')
    expect(r.state.history).toEqual([{ type: 'op', cells: [null, '100', '200', null], overflow: false, label: '＋' }])
    const r2 = run('100 enter 200 add')
    expect(r2.state.history).toEqual([{ type: 'op', cells: [null, null, '100', '200'], overflow: false, label: '＋' }])
  })

  it('3.3 の履歴の例（1000 外10% ＋ 3 ✕）', () => {
    const r = run('1000 taxOut1 add 3 mul')
    expect(r.state.history).toEqual([
      { type: 'op', cells: [null, null, null, '1000'], overflow: false, label: '外10%' },
      { type: 'op', cells: [null, null, '1000', '100'], overflow: false, label: '＋' },
      { type: 'op', cells: [null, null, '1100', '3'], overflow: false, label: '✕' },
    ])
    expect(r.x).toBe('3300')
  })
})

describe('税キー', () => {
  it('税率2のキーは税率2を使う', () => {
    expect(run('1000 taxOut2').x).toBe('80')
    expect(run('1080 taxIn2').x).toBe('80')
  })

  it('x が空ならスタック1を基準額にする', () => {
    const r = run('1000 enter taxOut1')
    expect(r.x).toBe('100')
    expect(r.state.stack).toEqual(['1000'])
  })

  it('値がなければ何もしない（エラーも出さない）', () => {
    const r = run('taxOut1')
    expect(r.error).toBeUndefined()
    expect(r.state).toEqual(initialState())
  })

  it('負の金額の税額（切り捨ては0に近い方へ）', () => {
    expect(run('negate 999 taxOut1').x).toBe('-99')
    expect(run('negate 999 taxOut1', { ...DEFAULT_SETTINGS, taxRounding: 'up' }).x).toBe('-100')
  })

  it('丸めないときは端数を残す', () => {
    expect(run('999 taxOut1', { ...DEFAULT_SETTINGS, taxRounding: 'none' }).x).toBe('99.9')
    const inner = run('1000 taxIn1', { ...DEFAULT_SETTINGS, taxRounding: 'none' }).x!
    expect(formatValue(inner, 10)).toBe('90.9090909091')
  })

  it('内税の結果を引くと税抜金額になる（8%）', () => {
    expect(run('1080 taxIn2 sub').x).toBe('1000')
  })

  it('小数の税率も扱える', () => {
    const settings = { ...DEFAULT_SETTINGS, taxRate1: '8.5' }
    expect(run('1000 taxOut1', settings).x).toBe('85')
    expect(keyLabel('taxOut1', settings)).toBe('外8.5%')
  })
})

describe('keyLabel', () => {
  it('演算子と税キーのラベル', () => {
    expect(keyLabel('add', DEFAULT_SETTINGS)).toBe('＋')
    expect(keyLabel('div', DEFAULT_SETTINGS)).toBe('÷')
    expect(keyLabel('taxOut1', DEFAULT_SETTINGS)).toBe('外10%')
    expect(keyLabel('taxIn2', DEFAULT_SETTINGS)).toBe('内8%')
  })
})

describe('履歴', () => {
  it(`最大 ${MAX_HISTORY} 行で、古い行から消える`, () => {
    let state = run('1 enter').state
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      state = run('1 add', DEFAULT_SETTINGS, state).state
    }
    expect(state.history).toHaveLength(MAX_HISTORY)
    // 各行の st1 は 1, 2, 3, … と増える。最初の5行（st1 が 1〜5）が消えている
    expect(state.history[0].cells?.[2]).toBe('6')
    expect(state.history.at(-1)?.cells?.[2]).toBe(String(MAX_HISTORY + 5))
  })
})

describe('純粋関数であること', () => {
  it('引数の state を変更しない', () => {
    const before = run('1 enter 2 enter 3').state
    const snapshot = structuredClone(before)
    for (const key of ['add', 'enter', 'clear', 'back', 'negate', 'taxOut1', '5', '.'] as Key[]) {
      reduce(before, key, DEFAULT_SETTINGS)
    }
    expect(before).toEqual(snapshot)
  })
})
