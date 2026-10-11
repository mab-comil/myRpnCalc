<script lang="ts">
  // 履歴欄（設計仕様書 3.3）
  import { formatValueFit } from '../core/number'
  import type { HistoryLine, Num } from '../core/types'
  import { maxChars } from '../fitText'

  /** 数値の文字の大きさ（rem）。CSS の --base にも使う */
  const CELL_REM = 0.95

  interface Props {
    lines: HistoryLine[]
    decimals: number
    onsettings: () => void
  }

  let { lines, decimals, onsettings }: Props = $props()

  let scroller: HTMLDivElement

  // 4列は同じ幅なので、見出しの1列を測って全セルに使う。収まらない値は小数の桁を減らす
  let columnWidth = $state(0)
  const limit = $derived(maxChars(columnWidth, CELL_REM))
  const text = (v: Num | null) => (v === null ? '' : formatValueFit(v, decimals, limit))

  // 行が増えたら一番下までスクロールする（ロール紙のイメージ）
  $effect(() => {
    void lines
    scroller.scrollTop = scroller.scrollHeight
  })
</script>

<section class="history" aria-label="履歴欄" style:--base="{CELL_REM}rem">
  <header class="row head">
    <span></span>
    <span>スタック3</span>
    <span>スタック2</span>
    <span>スタック1</span>
    <span bind:clientWidth={columnWidth}>スタック0</span>
    <button type="button" class="gear" aria-label="設定" onclick={onsettings}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
        />
      </svg>
    </button>
  </header>
  <div class="scroller" bind:this={scroller}>
    {#each lines as line, i (i)}
      {#if line.type === 'separator'}
        <div class="separator" role="separator"></div>
      {:else}
        <div class="row">
          <span class="more">{line.overflow ? '◀' : ''}</span>
          {#each line.cells ?? [] as cell, j (j)}
            {@const t = text(cell)}
            <div class="num-cell" style:--len={t.length}><span>{t}</span></div>
          {/each}
          <span class="label">{line.label}</span>
        </div>
      {/if}
    {/each}
  </div>
</section>

<style>
  .history {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .row {
    display: grid;
    grid-template-columns: 0.9rem repeat(4, minmax(0, 1fr)) 3.2rem;
    align-items: center;
    column-gap: 0.4rem;
    height: 1.75rem;
    padding: 0 0.5rem;
  }

  .head {
    flex: none;
    height: 2rem;
    font-size: 0.7rem;
    color: var(--muted);
    text-align: right;
    border-bottom: 1px solid var(--line);
  }

  .gear {
    justify-self: end;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--muted);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .scroller {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .more {
    font-size: 0.6rem;
    color: var(--muted);
  }

  .label {
    font-size: 0.8rem;
    color: var(--key-op-fg);
    white-space: nowrap;
  }

  .separator {
    height: 0;
    margin: 0.3rem 0.5rem;
    border-top: 1px dashed var(--muted);
  }
</style>
