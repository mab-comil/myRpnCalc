import { describe, expect, it } from 'vitest'
import { keyFromEvent, type KeyInput } from './keyboard'

function ev(key: string, code = '', extra: Partial<KeyInput> = {}): KeyInput {
  return { key, code, ctrlKey: false, metaKey: false, altKey: false, repeat: false, isComposing: false, ...extra }
}

describe('keyFromEvent（設計仕様書 5章）', () => {
  it.each([
    ['0', 'Digit0', '0'],
    ['5', 'Digit5', '5'],
    ['9', 'Digit9', '9'],
    ['.', 'Period', '.'],
    ['+', 'Semicolon', 'add'], // 日本語配列は Shift+;
    ['-', 'Minus', 'sub'],
    ['*', 'Quote', 'mul'], // 日本語配列は Shift+:
    ['/', 'Slash', 'div'],
    ['Enter', 'Enter', 'enter'],
    ['Backspace', 'Backspace', 'back'],
    ['Escape', 'Escape', 'clear'],
    ['Delete', 'Delete', 'clear'],
    ['n', 'KeyN', 'negate'],
    ['q', 'KeyQ', 'taxOut1'],
    ['w', 'KeyW', 'taxIn1'],
    ['e', 'KeyE', 'taxOut2'],
    ['r', 'KeyR', 'taxIn2'],
  ])('%s（%s）→ %s', (key, code, expected) => {
    expect(keyFromEvent(ev(key, code))).toBe(expected)
  })

  it('英字は大文字（Shift・CapsLock）でも同じ', () => {
    expect(keyFromEvent(ev('N', 'KeyN'))).toBe('negate')
    expect(keyFromEvent(ev('Q', 'KeyQ'))).toBe('taxOut1')
  })

  it.each([
    ['1', 'Numpad1', '1'],
    ['End', 'Numpad1', '1'], // NumLock オフ
    ['.', 'NumpadDecimal', '.'],
    [',', 'NumpadDecimal', '.'], // 小数点が , の地域
    ['Delete', 'NumpadDecimal', '.'], // NumLock オフ
    ['+', 'NumpadAdd', 'add'],
    ['-', 'NumpadSubtract', 'sub'],
    ['*', 'NumpadMultiply', 'mul'],
    ['/', 'NumpadDivide', 'div'],
    ['Enter', 'NumpadEnter', 'enter'],
  ])('テンキー: %s（%s）→ %s', (key, code, expected) => {
    expect(keyFromEvent(ev(key, code))).toBe(expected)
  })

  it('将来用に予約したキー（a / s / d / Ctrl+C）は何もしない', () => {
    expect(keyFromEvent(ev('a', 'KeyA'))).toBeNull()
    expect(keyFromEvent(ev('s', 'KeyS'))).toBeNull()
    expect(keyFromEvent(ev('d', 'KeyD'))).toBeNull()
    expect(keyFromEvent(ev('c', 'KeyC', { ctrlKey: true }))).toBeNull()
  })

  it('Ctrl・Alt・⌘ との組み合わせは無視する（ブラウザのショートカットを優先）', () => {
    expect(keyFromEvent(ev('r', 'KeyR', { ctrlKey: true }))).toBeNull()
    expect(keyFromEvent(ev('1', 'Digit1', { altKey: true }))).toBeNull()
    expect(keyFromEvent(ev('q', 'KeyQ', { metaKey: true }))).toBeNull()
  })

  it('IME で変換中の入力は無視する', () => {
    expect(keyFromEvent(ev('Enter', 'Enter', { isComposing: true }))).toBeNull()
  })

  it('押しっぱなしの繰り返しは ⌫ だけ受け付ける', () => {
    expect(keyFromEvent(ev('Backspace', 'Backspace', { repeat: true }))).toBe('back')
    expect(keyFromEvent(ev('Enter', 'Enter', { repeat: true }))).toBeNull()
    expect(keyFromEvent(ev('5', 'Digit5', { repeat: true }))).toBeNull()
  })

  it('対応しないキーは null', () => {
    expect(keyFromEvent(ev('x', 'KeyX'))).toBeNull()
    expect(keyFromEvent(ev('F5', 'F5'))).toBeNull()
    expect(keyFromEvent(ev('Tab', 'Tab'))).toBeNull()
  })
})
