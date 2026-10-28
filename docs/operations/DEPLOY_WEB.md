# Deploying the judge page (Vercel)

The judge page is static. `apps/web/build.mjs` turns the single source file into `apps/web/dist/index.html`. There is no server, no database and no secret.

## Build

```sh
node apps/web/build.mjs          # writes apps/web/dist/index.html
node apps/web/build.mjs --check  # validates the output; used by scripts/verify
```

The source file is a fragment (a `<title>`, `<style>`, markup and scripts) so it can also be published as a hosted artifact. The build wraps it in a full document with a doctype, language, viewport, theme color, description, Open Graph tags and an inline favicon.

## Vercel

Settings for the project (the committed `apps/web/vercel.json` carries them):

- Project name: `murmurz` (gives `https://murmurz.vercel.app` if the name is free)
- Root directory: `apps/web`
- Build command: `node build.mjs`
- Output directory: `dist`
- Framework preset: Other

```sh
cd apps/web
vercel link --project murmurz       # first time
vercel deploy --prod
```

`vercel.json` also sets security headers: a content-security-policy that allows only the page itself, Google Fonts and inline script and style (the page uses both), plus `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options`.

## Checks after deploy

1. Open the URL on a laptop and a phone. The hero, the three views (Home, Evidence, Limits) and the simulation should work.
2. The Evidence and Limits views are hash routes (`#evidence`, `#limits`); opening those URLs directly should land on the right view.
3. No request should go anywhere except the page and Google Fonts.

## What a deploy changes

Hosting the page is delivery only. It does not promote any claim: the claims stay at the states in `foundry/claims.jsonl`.
