# CLAUDE.md

業務用の逆ポーランド記法（RPN）電卓を PWA として作るプロジェクト。サーバーなし、データは localStorage に保存する。

## 資料

- `設計仕様書.md` — 仕様の正本。画面・キー動作・数値処理・永続化・PWA の決定事項はここにある。実装と食い違ったら、どちらに合わせるかをユーザーに確認する
- `作業工程.md` — 工程1〜10のチェックリスト。工程を終えたらチェックを付ける

## 構成

Svelte 5（runes）＋ TypeScript ＋ Vite ＋ vite-plugin-pwa ＋ big.js ＋ Vitest

- `src/lib/core/` — UI に依存しない計算エンジン。`reduce(state, key, settings)` は純粋関数に保ち、Svelte やブラウザ API を持ち込まない
- `src/lib/stores/` — `$state` による状態と localStorage への保存
- `src/lib/components/` — 画面部品
- `src/lib/keyboard.ts` — 物理キーと機能の対応表

数値は必ず big.js で扱い、JavaScript の number で計算しない。

## コマンド

```bash
npm install
npm run dev        # 開発サーバー
npm test           # Vitest（src/**/*.test.ts）
npm run check      # svelte-check と型チェック
npm run build      # 本番ビルド（dist/）
npm run preview    # ビルド結果の確認（Service Worker を含む PWA の動作はこちらで確認する）
npm run icons      # assets/icons/*.svg から public/icons/ の PNG を作り直す（rsvg-convert が必要）
```

## 公開

- GitHub Pages: https://mab-comil.github.io/myRpnCalc/ （リポジトリ mab-comil/myRpnCalc、Public）
- `main` に push すると `.github/workflows/deploy.yml` がテスト・型チェック・ビルドを行い、公開する。push は公開と同じ意味になるので注意

## 注意

- ドキュメントとコメントは日本語で書く
- `Ctrl+C` と `a` / `s` / `d` は将来の機能（設計仕様書 12.1）用に予約済み。ほかの機能に割り当てない
