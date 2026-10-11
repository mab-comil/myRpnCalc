<script lang="ts">
  // 設定画面（設計仕様書 3.5）。変更はすぐに反映して保存する
  import { dec, toNum } from '../core/number'
  import type { Settings, TaxRounding, Theme } from '../core/types'
  import { isTaxRate } from '../stores/storage'

  interface Props {
    open: boolean
    settings: Settings
    onchange: (patch: Partial<Settings>) => void
    onclearhistory: () => void
    onclose: () => void
  }

  let { open, settings, onchange, onclearhistory, onclose }: Props = $props()

  let dialog: HTMLDialogElement

  // 税率は入力途中の文字列を持ち、正しい値になったときだけ反映する
  let rate1 = $state('')
  let rate2 = $state('')
  const rate1Valid = $derived(isTaxRate(rate1.trim()))
  const rate2Valid = $derived(isTaxRate(rate2.trim()))

  $effect(() => {
    if (open && !dialog.open) {
      rate1 = settings.taxRate1
      rate2 = settings.taxRate2
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  })

  function changeRate(which: 'taxRate1' | 'taxRate2', text: string) {
    const t = text.trim()
    if (isTaxRate(t)) onchange({ [which]: toNum(dec(t)) })
  }

  function clearHistory() {
    if (confirm('履歴をすべて消去します。よろしいですか？')) onclearhistory()
  }

  const roundings: [TaxRounding, string][] = [
    ['down', '切り捨て'],
    ['halfUp', '四捨五入'],
    ['up', '切り上げ'],
    ['none', '丸めない'],
  ]
  const themes: [Theme, string][] = [
    ['auto', '自動'],
    ['light', 'ライト'],
    ['dark', 'ダーク'],
  ]
  const decimalChoices = Array.from({ length: 16 }, (_, i) => i)
</script>

<!-- Esc キーや外側のクリックでも閉じる -->
<dialog
  bind:this={dialog}
  aria-labelledby="settings-title"
  onclose={onclose}
  onclick={(e) => e.target === dialog && onclose()}
>
  <div class="body">
    <header>
      <h2 id="settings-title">設定</h2>
      <button type="button" class="close" onclick={onclose}>閉じる</button>
    </header>

    <div class="field">
      <label for="rate1">税率1（%）</label>
      <input
        id="rate1"
        inputmode="decimal"
        autocomplete="off"
        bind:value={rate1}
        oninput={() => changeRate('taxRate1', rate1)}
        aria-invalid={!rate1Valid}
      />
      {#if !rate1Valid}<p class="invalid">0以上の数値を入力してください</p>{/if}
    </div>

    <div class="field">
      <label for="rate2">税率2（%）</label>
      <input
        id="rate2"
        inputmode="decimal"
        autocomplete="off"
        bind:value={rate2}
        oninput={() => changeRate('taxRate2', rate2)}
        aria-invalid={!rate2Valid}
      />
      {#if !rate2Valid}<p class="invalid">0以上の数値を入力してください</p>{/if}
    </div>

    <fieldset class="field">
      <legend>税額の端数処理</legend>
      <div class="choices">
        {#each roundings as [value, label] (value)}
          <label class="choice">
            <input
              type="radio"
              name="rounding"
              {value}
              checked={settings.taxRounding === value}
              onchange={() => onchange({ taxRounding: value })}
            />
            {label}
          </label>
        {/each}
      </div>
    </fieldset>

    <div class="field">
      <label for="decimals">小数の表示桁数</label>
      <select
        id="decimals"
        value={settings.decimals}
        onchange={(e) => onchange({ decimals: Number(e.currentTarget.value) })}
      >
        {#each decimalChoices as n (n)}
          <option value={n}>{n}桁</option>
        {/each}
      </select>
    </div>

    <fieldset class="field">
      <legend>テーマ</legend>
      <div class="choices">
        {#each themes as [value, label] (value)}
          <label class="choice">
            <input
              type="radio"
              name="theme"
              {value}
              checked={settings.theme === value}
              onchange={() => onchange({ theme: value })}
            />
            {label}
          </label>
        {/each}
      </div>
    </fieldset>

    <div class="field">
      <button type="button" class="danger" onclick={clearHistory}>履歴を消去</button>
    </div>
  </div>
</dialog>

<style>
  dialog {
    width: min(420px, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 0.9rem;
    background: var(--panel);
    color: var(--fg);
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.45);
  }

  .body {
    padding: 0.5rem 1.25rem 1.25rem;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h2 {
    margin: 0.5rem 0;
    font-size: 1.15rem;
  }

  .field {
    margin: 0 0 1rem;
    padding: 0;
    border: none;
  }

  label,
  legend {
    display: block;
    margin-bottom: 0.35rem;
    padding: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  input:not([type='radio']),
  select {
    width: 100%;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
    font-size: 1rem;
  }

  input[aria-invalid='true'] {
    border-color: var(--error);
  }

  .invalid {
    margin: 0.3rem 0 0;
    font-size: 0.8rem;
    color: var(--error);
  }

  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
  }

  .choice {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin: 0;
    font-size: 1rem;
    color: var(--fg);
  }

  input[type='radio'] {
    accent-color: var(--accent);
  }

  button {
    padding: 0.55rem 1rem;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
    cursor: pointer;
  }

  .close {
    border-color: transparent;
    background: none;
    color: var(--accent);
  }

  .danger {
    width: 100%;
    color: var(--error);
  }
</style>
