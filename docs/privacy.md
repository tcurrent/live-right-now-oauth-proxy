# Privacy

The OAuth Proxy exchanges provider authorization codes and stores a handoff record for at most five minutes. A handoff record contains an access token and the SHA-256 proof supplied by the plugin; it is stored in a Cloudflare Durable Object and deleted immediately after successful redemption.

The proxy does not use analytics or telemetry and must not log authorization codes, access tokens, refresh tokens, handoff codes, or handoff secrets. Provider client secrets are stored only as Cloudflare Worker secrets.