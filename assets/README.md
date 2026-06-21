# Hero assets

TOPページの HERO セクション向けに作成した、アイソメトリック（2:1 dimetric）イラストです。
テーマは "Building products" — 開発者 / デザイナーのワークスペース。

| ファイル | 用途 |
| --- | --- |
| `hero-isometric.svg` | ヒーロー本体のイラスト（1200×760、ベクター・背景込み） |
| `hero-preview.html` | ヒーローセクションとしての組み込み例（左にコピー、右にイラスト＋浮遊アニメ） |

## プレビュー

```bash
# リポジトリ直下で
python3 -m http.server 8000
# → http://localhost:8000/assets/hero-preview.html
```

## 含まれる要素

- ベースのプラットフォーム（violet スラブ）
- コードを表示したモニター + キーボード
- 観葉植物 / コーヒーマグ
- 浮遊する 5 枚の UI カード（ENSO アプリ: Focus / Habit / Journal / Finance / Mood をイメージ）
- アクセントの浮遊立方体・球体

## 再生成・カスタマイズ

ジオメトリは `tools/build-hero.mjs` で生成しています（アイソメ投影を正確に保つため）。
色やレイアウトを変えたいときはスクリプト上部の定数を編集して再生成してください。

```bash
node tools/build-hero.mjs
```

主な調整ポイント:

- `TILE` / `UZ` … タイルサイズと高さスケール
- `PLAT` / `DESK` … プラットフォーム・デスクのベースカラー
- `appAccents` … 浮遊カードのアクセントカラー
- `faces()` の係数 … 各面の陰影（光の向き）

背景なしで使いたい場合は SVG 冒頭の 2 枚の `<rect ... fill="url(#bg)">` / `fill="url(#glow)">`
を削除すれば透過になります。
