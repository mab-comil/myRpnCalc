// 物理キーと機能の対応表（設計仕様書 5章）
import type { Key } from './core/types'

/** KeyboardEvent のうち、判定に使う部分 */
export type KeyInput = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat' | 'isComposing'>

/** テンキーは NumLock の状態に関係なく、物理的な位置（code）で判定する */
const BY_CODE: Record<string, Key> = {
  Numpad0: '0',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3',
  Numpad4: '4',
  Numpad5: '5',
  Numpad6: '6',
  Numpad7: '7',
  Numpad8: '8',
  Numpad9: '9',
  NumpadDecimal: '.', // 地域によっては ',' を出すため code で判定する
  NumpadAdd: 'add',
  NumpadSubtract: 'sub',
  NumpadMultiply: 'mul',
  NumpadDivide: 'div',
  NumpadEnter: 'enter',
}

/** 入力される文字（key）で判定する。英字は小文字にしてから引く */
const BY_KEY: Record<string, Key> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '.': '.',
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '/': 'div',
  enter: 'enter',
  backspace: 'back',
  escape: 'clear',
  delete: 'clear',
  n: 'negate',
  q: 'taxOut1',
  w: 'taxIn1',
  e: 'taxOut2',
  r: 'taxIn2',
  // a / s / d と Ctrl+C は将来の機能（設計仕様書 12.1）用に予約。ここには割り当てない
}

/** 押しっぱなしで繰り返してよいキー */
const REPEATABLE = new Set<Key>(['back'])

/**
 * 物理キーの入力を電卓のキーに変換する。対応しないときは null。
 * - Ctrl・Alt・⌘ と一緒に押されたときは、ブラウザのショートカットを優先して無視する
 * - IME で変換中の入力は無視する
 * - 押しっぱなしによる繰り返しは ⌫ だけ受け付ける
 */
export function keyFromEvent(e: KeyInput): Key | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return null
  const key = BY_CODE[e.code] ?? BY_KEY[e.key.toLowerCase()] ?? null
  if (key === null) return null
  if (e.repeat && !REPEATABLE.has(key)) return null
  return key
}
