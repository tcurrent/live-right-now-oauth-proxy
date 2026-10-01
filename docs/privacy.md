# Privacy

The OAuth Proxy exchanges authorization codes submitted by its hosted OAuth page and stores handoff records for at most five minutes. The RuneLite plugin submits Kick authorization codes after Kick redirects to its local callback; Twitch tokens from the plugin's implicit flow are not sent to the proxy. A handoff record contains an access token and the SHA-256 proof supplied by the plugin; it is stored in a Cloudflare Durable Object and deleted immediately after successful redemption.

The proxy does not use analytics or telemetry and must not log authorization codes, access tokens, refresh tokens, handoff codes, or handoff secrets. Provider client secrets are stored only as Cloudflare Worker secrets.