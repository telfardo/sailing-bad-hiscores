# Sailing Bad HiScores

An unofficial Old School RuneScape HiScores site that calculates totals without Sailing. Website lookups are not tracked; players only join the community leaderboard after opting in through the Sailing Bad RuneLite plugin.

## Deploy on Netlify

1. In Netlify, choose **Add new project → Import an existing project**.
2. Select the public [`telfardo/sailing-bad-hiscores`](https://github.com/telfardo/sailing-bad-hiscores) repository.
3. Keep the build settings from `netlify.toml` and publish the site.
4. Add `2277.telfardo.com` under **Domain management → Production domains**.

Netlify will build and redeploy the site whenever `main` changes.

## Local development

Netlify's Vite plugin emulates Functions and Blobs inside the normal Vite server, so player search works locally:

```bash
npm run dev
```

The site is then available at the URL Vite prints, normally `http://localhost:5173`.

## Plugin opt-in endpoint

When a player enables the Sailing Bad HiScores option, the plugin should send:

```http
POST https://2277.telfardo.com/api/hiscores
Content-Type: application/json

{"player":"RuneScape Name"}
```

`GET /api/hiscores?player=RuneScape%20Name` performs a private lookup without adding a new player. `POST` is the explicit opt-in operation.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test
```

## Disclaimer

This is an unofficial fan project and is not affiliated with or endorsed by Jagex Ltd. Old School RuneScape and RuneScape are trademarks of Jagex Ltd.
