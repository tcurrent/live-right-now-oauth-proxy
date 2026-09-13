# Security

The browser never receives a provider access token. It receives only a random handoff code, which can be redeemed once within five minutes by presenting the matching secret generated and retained by the RuneLite plugin.

The Worker accepts authorization-code exchanges only from the configured GitHub Pages origin. It uses a fixed configured redirect URI, validates supported providers, and rejects browser attempts to redeem handoff codes.

Production deployments must originate from protected version tags through `.github/workflows/deploy.yml`. Record the tag, commit SHA, and Cloudflare Worker deployment version in each GitHub release.