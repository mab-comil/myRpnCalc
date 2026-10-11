import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, MAX_HISTORY, initialState } from '../core/engine'
import type { CalcState } from '../core/types'
import { parseCalcState, parseSettings, readJSON, writeJSON, type StorageLike } from './storage'

/** 読み書きのたびに例外を投げるストレージ */
const broken: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

const valid: CalcState = {
  x: { kind: 'input', text: '-12.30' },
  stack: ['1', '2.5', '-3'],
  history: [
    { type: 'op', cells: [null, null, '1000', '100'], overflow: false, label: '＋' },
    { type: 'separator' },
  ],
}

describe('readJSON / writeJSON', () => {
  it('保存して読み込める', () => {
    const map = new Map<string, string>()
    const storage: StorageLike = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) }
    writeJSON(storage, 'k', { a: 1 })
    expect(readJSON(storage, 'k')).toEqual({ a: 1 })
  })

  it('ないとき・壊れた JSON・例外・ストレージなしは undefined', () => {
    const storage: StorageLike = { getItem: (k) => (k === 'bad' ? '{oops' : null), setItem: () => {} }
    expect(readJSON(storage, 'none')).toBeUndefined()
    expect(readJSON(storage, 'bad')).toBeUndefined()
    expect(readJSON(broken, 'k')).toBeUndefined()
    expect(readJSON(null, 'k')).toBeUndefined()
  })

  it('保存の失敗は無視する', () => {
    expect(() => writeJSON(broken, 'k', 1)).not.toThrow()
    expect(() => writeJSON(null, 'k', 1)).not.toThrow()
  })
})

describe('parseCalcState', () => {
  it('正しい状態はそのまま使う', () => {
    expect(parseCalcState(structuredClone(valid))).toEqual(valid)
  })

  it('x の3種類を受け付ける', () => {
    for (const x of [
      { kind: 'empty', negative: true },
      { kind: 'input', text: '0.' },
      { kind: 'value', value: '-0.5' },
    ]) {
      expect(parseCalcState({ ...valid, x }).x).toEqual(x)
    }
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['配列', []],
    ['x がない', { stack: [], history: [] }],
    ['x の kind が不明', { ...valid, x: { kind: 'foo' } }],
    ['入力中が空文字', { ...valid, x: { kind: 'input', text: '' } }],
    ['入力中が負号だけ', { ...valid, x: { kind: 'input', text: '-' } }],
    ['入力中が16桁', { ...valid, x: { kind: 'input', text: '1234567890123456' } }],
    ['値が指数表記', { ...valid, x: { kind: 'value', value: '1e5' } }],
    ['値が数値型', { ...valid, x: { kind: 'value', value: 5 } }],
    ['スタックに数値でないもの', { ...valid, stack: ['1', 'abc'] }],
    ['スタックが配列でない', { ...valid, stack: '1' }],
    ['履歴の cells が3つ', { ...valid, history: [{ type: 'op', cells: [null, null, '1'], overflow: false, label: '＋' }] }],
    ['履歴の type が不明', { ...valid, history: [{ type: 'foo' }] }],
  ])('%s → 初期状態', (_, raw) => {
    expect(parseCalcState(raw)).toEqual(initialState())
  })

  it(`履歴は最大 ${MAX_HISTORY} 行に切り詰める`, () => {
    const history = Array.from({ length: MAX_HISTORY + 10 }, () => ({ type: 'separator' as const }))
    expect(parseCalcState({ ...valid, history }).history).toHaveLength(MAX_HISTORY)
  })
})

describe('parseSettings', () => {
  it('ないときは初期値', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('oops')).toEqual(DEFAULT_SETTINGS)
  })

  it('正しい設定はそのまま使う', () => {
    const s = { taxRate1: '8.5', taxRate2: '0', taxRounding: 'none', decimals: 0, theme: 'dark' }
    expect(parseSettings(s)).toEqual(s)
  })

  it('おかしい項目だけ初期値に戻す', () => {
    expect(
      parseSettings({ taxRate1: '-5', taxRate2: 8, taxRounding: 'floor', decimals: 16, theme: 'dark' }),
    ).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
    expect(parseSettings({ decimals: 2.5 }).decimals).toBe(DEFAULT_SETTINGS.decimals)
    expect(parseSettings({ decimals: -1 }).decimals).toBe(DEFAULT_SETTINGS.decimals)
  })

  it('知らない項目は捨てる', () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, extra: 1 })).toEqual(DEFAULT_SETTINGS)
  })
})
