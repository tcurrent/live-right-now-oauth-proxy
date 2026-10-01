# Security

The browser never receives a provider access token. It receives only a random handoff code, which can be redeemed once within five minutes by presenting the matching secret generated and retained by the RuneLite plugin.

The Worker exchanges provider authorization codes from the hosted OAuth page using fixed redirect URIs. The RuneLite plugin uses the Worker for Kick's exchange and handoff; Twitch authorization in the plugin uses the implicit grant and does not send its access token to the Worker. The Worker rejects browser attempts to redeem handoff codes.

Production deployments must originate from protected version tags through `.github/workflows/deploy.yml`. Record the tag, commit SHA, and Cloudflare Worker deployment version in each GitHub release.