# ANDY'S WORLD — All Sites & Games

あっくんのWebサイト・ゲーム・実験作品をひとつにまとめるポータルです。

## Live hub
Vercelで公開予定：GitHubの `main` ブランチに接続して自動デプロイします。

## Included projects

| Project | Category | Link / Status |
|---|---|---|
| たくさんの卵の中からハゲを見つける | Browser game | https://egg-hage-game.vercel.app |
| Andy Fighter Arena | Browser fighting game | https://atsuki-fighter-arena.vercel.app |
| 3n Logic | Browser game | `/games/3n-logic.html` (included in this repository) |
| ATSUKI ARCADE | Legacy game hub | https://pause-lab.vercel.app (legacy API currently returns an empty games list) |
| Focus Flow AI v8.0 | Experimental web app | https://focus-flow-ai-phi.vercel.app |
| FOCUS LAB | Experimental web app | https://focus-lab-github.vercel.app |
| 命の砂時計 | Web app | https://inochi-no-sunadokei-andy127.vercel.app |
| Focus Flow AI v7.0 | Older version | https://contribute-data-try-v70-demo-1.vercel.app |
| 3D Eraser Bounce | Python simulation source | https://github.com/Andy234-andy/3D-Eraser-Bounce |

## Recovery notes

- The portal links to the verified existing deployments rather than copying their source code into this repository.
- The 3n Logic HTML game has been copied into `games/3n-logic.html` so it can run directly from this hub.
- The old ATSUKI ARCADE page responds, but its `/api/games` endpoint currently returns `{"games":[]}`. It is listed as a recovery target, not represented as a working game list.
- Focus Flow AI and FOCUS LAB display experimental visual signals only. They are not scientifically validated tests of concentration or ability.
- Some older Vercel projects may require account access depending on deployment protection settings.

## Structure

- `index.html` — searchable portfolio and project hub
- `games/3n-logic.html` — playable 3n Logic game
