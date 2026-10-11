<script lang="ts">
  // 入力欄（設計仕様書 3.2）
  import { formatValueFit, formatX } from '../core/number'
  import type { Num, X } from '../core/types'
  import { maxChars } from '../fitText'

  /** 文字の大きさ（rem）。CSS の --base にも使う */
  const UPPER_REM = 1.05
  const LOWER_REM = 2.75

  interface Props {
    x: X
    stack: Num[]
    decimals: number
    error: string | null
  }

  let { x, stack, decimals, error }: Props = $props()

  // 枠の幅を測り、収まらない確定値は小数の桁を減らして表示する
  let upperWidths = $state([0, 0, 0])
  let lowerWidth = $state(0)

  /** 上段: 左からスタック3・2・1 */
  const upper = $derived(
    [stack[2], stack[1], stack[0]].map((v, i) =>
      v === undefined ? '' : formatValueFit(v, decimals, maxChars(upperWidths[i], UPPER_REM)),
    ),
  )
  const overflow = $derived(stack.length > 3)
  const main = $derived(formatX(x, decimals, maxChars(lowerWidth, LOWER_REM)))
</script>

<section class="display" aria-label="入力欄">
  <div class="upper">
    {#each upper as text, i (i)}
      <div class="slot" style:--base="{UPPER_REM}rem">
        {#if i === 0 && overflow}<span class="more" aria-label="スタック4以降あり">◀</span>{/if}
        <div class="num-cell" style:--len={text.length} bind:clientWidth={upperWidths[i]}><span>{text}</span></div>
      </div>
    {/each}
  </div>
  <div class="lower" style:--base="{LOWER_REM}rem" aria-live="polite">
    {#if error !== null}
      <span class="error">{error}</span>
    {:else}
      <div class="num-cell" style:--len={main.length} bind:clientWidth={lowerWidth}><span>{main}</span></div>
    {/if}
  </div>
</section>

<style>
  .display {
    display: grid;
    grid-template-rows: 1fr 2fr;
    height: 7.5rem;
    background: var(--panel);
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .upper {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-bottom: 1px solid var(--line);
  }

  .slot {
    display: flex;
    align-items: center;
    min-width: 0;
    padding: 0 0.5rem;
    color: var(--muted);
  }

  .slot + .slot {
    border-left: 1px solid var(--line);
  }

  .slot .num-cell {
    flex: 1;
    min-width: 0;
  }

  .more {
    flex: none;
    margin-right: 0.25rem;
    font-size: 0.7rem;
  }

  .lower {
    display: flex;
    align-items: center;
    min-width: 0;
    justify-content: flex-end;
    padding: 0 0.75rem;
    font-weight: 500;
    line-height: 1;
  }

  .lower .num-cell {
    flex: 1;
    min-width: 0;
  }

  .error {
    color: var(--error);
    font-size: 1.5rem;
  }
</style>
