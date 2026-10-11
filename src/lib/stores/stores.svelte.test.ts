import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, ERROR_DIV_ZERO, ERROR_OPERAND, initialState } from '../core/engine'
import type { Key } from '../core/types'
import { CalcStore, ERROR_DURATION } from './calc.svelte'
import { SettingsStore } from './settings.svelte'
import { SETTINGS_KEY, STATE_KEY, type StorageLike } from './storage'

/** Map を使った localStorage の代わり */
function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const storage: StorageLike & { map: Map<string, string>; writes: number } = {
    map,
    writes: 0,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      storage.writes++
      map.set(k, v)
    },
  }
  return storage
}

function press(calc: CalcStore, keys: string) {
  for (const k of keys.split(' ')) calc.press(k as Key)
}

describe('SettingsStore', () => {
  it('保存がなければ初期値', () => {
    expect(new SettingsStore(memoryStorage()).current).toEqual(DEFAULT_SETTINGS)
  })

  it('変更すると保存し、次に起動したときに戻る', () => {
    const storage = memoryStorage()
    new SettingsStore(storage).update({ taxRate1: '12', decimals: 4 })
    const restored = new SettingsStore(storage)
    expect(restored.current).toEqual({ ...DEFAULT_SETTINGS, taxRate1: '12', decimals: 4 })
  })

  it('おかしい値で update しても初期値に戻す', () => {
    const s = new SettingsStore(memoryStorage())
    s.update({ decimals: 99 })
    expect(s.current.decimals).toBe(DEFAULT_SETTINGS.decimals)
  })

  it('壊れた保存データなら初期値で起動する', () => {
    expect(new SettingsStore(memoryStorage({ [SETTINGS_KEY]: '{' })).current).toEqual(DEFAULT_SETTINGS)
  })

  it('ストレージが使えなくても動く', () => {
    const s = new SettingsStore(null)
    s.update({ taxRate2: '5' })
    expect(s.current.taxRate2).toBe('5')
  })
})

describe('CalcStore', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const settings = { current: DEFAULT_SETTINGS }

  it('保存がなければ初期状態', () => {
    expect(new CalcStore(settings, memoryStorage()).state).toEqual(initialState())
  })

  it('キーを押すたびに保存し、次に起動したときにスタックと履歴が戻る', () => {
    const storage = memoryStorage()
    const calc = new CalcStore(settings, storage)
    press(calc, '1 0 0 enter 2 add 7')
    const restored = new CalcStore(settings, storage)
    expect(restored.state).toEqual(calc.state)
    expect(restored.state.x).toEqual({ kind: 'input', text: '7' })
    expect(restored.state.stack).toEqual(['102'])
    expect(restored.state.history).toHaveLength(1)
  })

  it('状態が変わらないキーでは保存しない', () => {
    const storage = memoryStorage()
    const calc = new CalcStore(settings, storage)
    press(calc, 'back enter add')
    expect(storage.writes).toBe(0)
  })

  it('壊れた保存データなら初期状態で起動する', () => {
    const storage = memoryStorage({ [STATE_KEY]: '{"x":1}' })
    expect(new CalcStore(settings, storage).state).toEqual(initialState())
  })

  it('税キーは現在の設定を使う', () => {
    const s = { current: DEFAULT_SETTINGS }
    const calc = new CalcStore(s, memoryStorage())
    s.current = { ...DEFAULT_SETTINGS, taxRate1: '5' }
    press(calc, '1 0 0 0 taxOut1')
    expect(calc.state.x).toEqual({ kind: 'value', value: '50' })
  })

  it('エラーは約1.5秒表示して消える。状態は変わらない', () => {
    const calc = new CalcStore(settings, memoryStorage())
    press(calc, '5')
    const before = calc.state
    calc.press('add')
    expect(calc.error).toBe(ERROR_OPERAND)
    expect(calc.state).toBe(before)
    vi.advanceTimersByTime(ERROR_DURATION - 1)
    expect(calc.error).toBe(ERROR_OPERAND)
    vi.advanceTimersByTime(1)
    expect(calc.error).toBeNull()
  })

  it('続けてエラーになったら、新しいエラーから1.5秒表示する', () => {
    const calc = new CalcStore(settings, memoryStorage())
    press(calc, '5 enter 0')
    calc.press('div')
    vi.advanceTimersByTime(1000)
    calc.press('div')
    expect(calc.error).toBe(ERROR_DIV_ZERO)
    vi.advanceTimersByTime(1000)
    expect(calc.error).toBe(ERROR_DIV_ZERO)
    vi.advanceTimersByTime(500)
    expect(calc.error).toBeNull()
  })

  it('エラー表示中に別のキーを押すと、すぐにエラーを消す', () => {
    const calc = new CalcStore(settings, memoryStorage())
    press(calc, '5 add')
    expect(calc.error).toBe(ERROR_OPERAND)
    calc.press('3')
    expect(calc.error).toBeNull()
  })

  it('履歴の消去（スタックは残す）', () => {
    const storage = memoryStorage()
    const calc = new CalcStore(settings, storage)
    press(calc, '1 enter 2 add 3')
    calc.clearHistory()
    expect(calc.state.history).toEqual([])
    expect(calc.state.stack).toEqual(['3'])
    expect(new CalcStore(settings, storage).state.history).toEqual([])
  })

  it('ストレージが使えなくても動く', () => {
    const calc = new CalcStore(settings, null)
    press(calc, '2 enter 3 mul')
    expect(calc.state.x).toEqual({ kind: 'value', value: '6' })
  })
})
