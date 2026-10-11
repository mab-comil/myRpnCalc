// 設定（$state）と永続化（設計仕様書 3.5・6章）
import type { Settings } from '../core/types'
import { SETTINGS_KEY, browserStorage, parseSettings, readJSON, writeJSON, type StorageLike } from './storage'

export class SettingsStore {
  #storage: StorageLike | null

  /** 現在の設定。変更は update() で行う */
  current = $state.raw<Settings>(parseSettings(undefined))

  constructor(storage: StorageLike | null = browserStorage()) {
    this.#storage = storage
    this.current = parseSettings(readJSON(storage, SETTINGS_KEY))
  }

  update(patch: Partial<Settings>): void {
    this.current = parseSettings({ ...this.current, ...patch })
    writeJSON(this.#storage, SETTINGS_KEY, this.current)
  }
}

export const settings = new SettingsStore()
