<script lang="ts">
  // 全体レイアウト（設計仕様書 3.1）
  import HistoryPane from './lib/components/HistoryPane.svelte'
  import Keypad from './lib/components/Keypad.svelte'
  import SettingsDialog from './lib/components/SettingsDialog.svelte'
  import StackDisplay from './lib/components/StackDisplay.svelte'
  import type { Key } from './lib/core/types'
  import { keyFromEvent } from './lib/keyboard'
  import { calc } from './lib/stores/calc.svelte'
  import { settings } from './lib/stores/settings.svelte'

  let settingsOpen = $state(false)

  // テーマ: 自動のときは data-theme を付けず、端末の設定に従う
  $effect(() => {
    const theme = settings.current.theme
    if (theme === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
  })

  // 上部のバーの色（theme-color）を、実際に表示しているテーマの背景色に合わせる
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
  let systemDark = $state(prefersDark.matches)
  $effect(() => {
    const update = () => (systemDark = prefersDark.matches)
    prefersDark.addEventListener('change', update)
    return () => prefersDark.removeEventListener('change', update)
  })
  $effect(() => {
    const theme = settings.current.theme
    const dark = theme === 'dark' || (theme === 'auto' && systemDark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121418' : '#eef0f3')
  })

  // 物理キーボード（設計仕様書 5章）。押したキーをテンキー上でも一瞬光らせる
  let highlight = $state<Key | null>(null)
  let highlightTimer: ReturnType<typeof setTimeout> | undefined

  function onkeydown(e: KeyboardEvent) {
    if (settingsOpen) return
    const key = keyFromEvent(e)
    if (key === null) return
    e.preventDefault()
    calc.press(key)
    highlight = key
    clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => (highlight = null), 120)
  }
</script>

<svelte:window {onkeydown} />

<div class="app">
  <div class="top">
    <HistoryPane
      lines={calc.state.history}
      decimals={settings.current.decimals}
      onsettings={() => (settingsOpen = true)}
    />
    <StackDisplay
      x={calc.state.x}
      stack={calc.state.stack}
      decimals={settings.current.decimals}
      error={calc.error}
    />
  </div>
  <Keypad settings={settings.current} onkey={(key) => calc.press(key)} {highlight} />
</div>

<SettingsDialog
  open={settingsOpen}
  settings={settings.current}
  onchange={(patch) => settings.update(patch)}
  onclearhistory={() => calc.clearHistory()}
  onclose={() => (settingsOpen = false)}
/>

<style>
  .app {
    display: grid;
    grid-template-rows: 1fr 1fr;
    height: 100%;
    max-width: 520px;
    margin: 0 auto;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
      env(safe-area-inset-left);
  }

  .top {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    min-height: 0;
  }
</style>
