// 計算状態（$state）と永続化（設計仕様書 4.4・6章）
import { reduce } from '../core/engine'
import type { CalcState, Key, Settings } from '../core/types'
import { settings as appSettings } from './settings.svelte'
import { STATE_KEY, browserStorage, parseCalcState, readJSON, writeJSON, type StorageLike } from './storage'

/** エラーメッセージを表示しておく時間（ミリ秒） */
export const ERROR_DURATION = 1500

export class CalcStore {
  #storage: StorageLike | null
  #settings: { readonly current: Settings }
  #errorTimer: ReturnType<typeof setTimeout> | undefined

  /** 計算状態。reduce が新しいオブジェクトを返すため、深い追跡はしない（$state.raw） */
  state = $state.raw<CalcState>(parseCalcState(undefined))
  /** 表示中のエラーメッセージ。約1.5秒で null に戻る */
  error = $state<string | null>(null)

  constructor(settings: { readonly current: Settings } = appSettings, storage: StorageLike | null = browserStorage()) {
    this.#settings = settings
    this.#storage = storage
    this.state = parseCalcState(readJSON(storage, STATE_KEY))
  }

  press(key: Key): void {
    const { state, error } = reduce(this.state, key, this.#settings.current)
    if (error !== undefined) this.#showError(error)
    else if (this.error !== null) this.#clearError()
    this.#set(state)
  }

  /** 履歴をすべて消す（スタックはそのまま） */
  clearHistory(): void {
    this.#set({ ...this.state, history: [] })
  }

  #set(state: CalcState): void {
    if (state === this.state) return
    this.state = state
    writeJSON(this.#storage, STATE_KEY, state)
  }

  #showError(message: string): void {
    clearTimeout(this.#errorTimer)
    this.error = message
    this.#errorTimer = setTimeout(() => (this.error = null), ERROR_DURATION)
  }

  #clearError(): void {
    clearTimeout(this.#errorTimer)
    this.error = null
  }
}

export const calc = new CalcStore()
