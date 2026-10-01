# Security

The browser never receives a provider access token. It receives only a random handoff code, which can be redeemed once within five minutes by presenting the matching secret generated and retained by the RuneLite plugin.

The Worker accepts Twitch and Kick authorization-code exchanges from RuneLite over HTTPS after each provider redirects to the local callback. It also retains the hosted-page exchange path for the configured GitHub Pages origin. It uses fixed provider-specific redirect URIs, validates supported providers, and rejects browser attempts to redeem handoff codes.

Production deployments must originate from protected version tags through `.github/workflows/deploy.yml`. Record the tag, commit SHA, and Cloudflare Worker deployment version in each GitHub release.