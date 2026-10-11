<script lang="ts">
  // テンキー部（設計仕様書 3.4）
  import { keyLabel } from '../core/engine'
  import type { Key, Settings } from '../core/types'

  interface Props {
    settings: Settings
    onkey: (key: Key) => void
    /** 物理キーボードで押されたキー。押下中と同じ見た目にする */
    highlight?: Key | null
  }

  let { settings, onkey, highlight = null }: Props = $props()

  type Kind = 'num' | 'op' | 'tax' | 'edit' | 'enter'
  interface Button {
    key: Key
    kind: Kind
    label?: string
    name?: string // 読み上げ用
  }

  const num = (key: Key): Button => ({ key, kind: 'num' })
  const op = (key: 'add' | 'sub' | 'mul' | 'div', name: string): Button => ({ key, kind: 'op', name })
  const tax = (key: 'taxOut1' | 'taxIn1' | 'taxOut2' | 'taxIn2'): Button => ({ key, kind: 'tax' })

  const buttons: Button[] = [
    { key: 'negate', kind: 'edit', label: '＋/−', name: '符号反転' },
    tax('taxOut1'),
    tax('taxIn1'),
    tax('taxOut2'),
    tax('taxIn2'),
    num('7'),
    num('8'),
    num('9'),
    op('add', '足す'),
    op('mul', '掛ける'),
    num('4'),
    num('5'),
    num('6'),
    op('sub', '引く'),
    op('div', '割る'),
    num('1'),
    num('2'),
    num('3'),
    { key: 'clear', kind: 'edit', label: 'C', name: 'クリア' },
    { key: 'back', kind: 'edit', label: '⌫', name: '1文字消す' },
    num('0'),
    num('00'),
    num('.'),
    { key: 'enter', kind: 'enter', label: 'Enter' },
  ]

  function labelOf(b: Button): string {
    if (b.kind === 'op' || b.kind === 'tax') return keyLabel(b.key as Parameters<typeof keyLabel>[0], settings)
    return b.label ?? b.key
  }

  let pressed = $state<Key | null>(null)

  // 押した瞬間に反応させるため pointerdown で処理する。
  // preventDefault でフォーカスを移さない（物理キーボードの Enter が二重に効かないように）。
  function down(e: PointerEvent, key: Key) {
    if (e.button !== 0) return
    e.preventDefault()
    pressed = key
    onkey(key)
  }

  function up() {
    pressed = null
  }
</script>

<div class="keypad" role="group" aria-label="テンキー">
  {#each buttons as b (b.key)}
    <button
      type="button"
      tabindex="-1"
      class="key {b.kind}"
      class:pressed={pressed === b.key || highlight === b.key}
      aria-label={b.name}
      onpointerdown={(e) => down(e, b.key)}
      onpointerup={up}
      onpointercancel={up}
      onpointerleave={up}
      oncontextmenu={(e) => e.preventDefault()}
    >
      {labelOf(b)}
    </button>
  {/each}
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(5, 1fr);
    gap: 0.4rem;
    padding: 0.5rem;
    min-height: 0;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .key {
    min-width: 0;
    min-height: 0;
    padding: 0;
    border: none;
    border-radius: 0.6rem;
    box-shadow: 0 1px 0 var(--key-shadow-color);
    font: inherit;
    font-size: 1.5rem;
    cursor: pointer;
    touch-action: manipulation;
  }

  .key.pressed {
    transform: translateY(1px);
    box-shadow: inset 0 0 0 100vmax var(--key-pressed-overlay);
  }

  .num {
    background: var(--key-num);
    color: var(--key-num-fg);
  }

  .op {
    background: var(--key-op);
    color: var(--key-op-fg);
    font-size: 1.7rem;
  }

  .tax {
    background: var(--key-tax);
    color: var(--key-tax-fg);
    font-size: 1rem;
  }

  .edit {
    background: var(--key-edit);
    color: var(--key-edit-fg);
    font-size: 1.25rem;
  }

  .enter {
    grid-column: span 2;
    background: var(--key-enter);
    color: var(--key-enter-fg);
    font-size: 1.25rem;
    font-weight: 600;
  }
</style>
