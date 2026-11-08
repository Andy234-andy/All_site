# ANDY'S WORLD — All Sites & Games

あっくんがこれまで制作したゲーム、Webアプリ、実験、macOSアプリをまとめた作品ポータルです。

## Live hub

- **Portal:** https://all-site-andy127.vercel.app
- **GitHub:** https://github.com/Andy234-andy/All_site
- GitHub の `main` ブランチと Vercel を接続し、更新を自動デプロイします。

## Restored inside this repository

| Path | Project | Notes |
|---|---|---|
| `games/egg-hage/index.html` | たくさんの卵の中からハゲを見つける | 元の公開HTMLを収録 |
| `games/fighter-arena/index.html` | Andy Fighter Arena | 元の公開HTMLを収録 |
| `games/3n-logic.html` | 3n Logic | 元のHTML。スマホ用タップ操作も追加 |
| `apps/life-hourglass/index.html` | 命の砂時計 | 元の公開HTMLを収録 |
| `apps/focus-flow-ai/index.html` | Focus Flow AI v8.0 | 元のHTMLを収録。ルート専用Analytics読み込みは削除 |
| `apps/focus-lab/index.html` | FOCUS LAB | 元のHTMLを収録 |
| `experiments/3d-eraser-bounce.py` | 3D Eraser Bounce | 元のPythonシミュレーションを収録 |

## Linked projects and legacy targets

| Project | Link | State |
|---|---|---|
| Conscio macOS App | https://github.com/Andy234-andy/conscio | GitHubにソースと配布ビルド |
| Focus Flow AI v7.0 | https://contribute-data-try-v70-demo-1.vercel.app | 旧版リンク。旧API依存があるため独立スナップショットにはしていません |
| ATSUKI ARCADE | https://pause-lab.vercel.app | 旧ページは応答するが、`/api/games` は現在 `{"games":[]}` を返すため復旧待ち |

## Notes

- Focus Flow AI と FOCUS LAB の視覚サインは実験的な目安であり、集中力・能力・健康状態を科学的に判定するものではありません。
- 各Webアプリは元ページのHTMLをこのリポジトリ内に収録し、元のVercel URLも残しています。
- 旧 ATSUKI ARCADE は画面だけでなく、元のゲームデータAPIも復旧する必要があります。空のデータを「復旧済み」とは扱っていません。
- `Minecraft-good-seed` リポジトリは確認時点で空だったため、収録対象のソースはありませんでした。

## Structure

- `index.html` — 検索できる作品ポータル
- `games/` — ブラウザゲーム
- `apps/` — Webアプリ
- `experiments/` — Pythonなどの実験コード
