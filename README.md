# live-right-now-oauth-proxy

A serverless OAuth 2.0 exchange service for the [Live Right Now](https://github.com/tcurrent/live-right-now) RuneLite plugin. It keeps provider client secrets in Cloudflare Worker secrets and returns a short-lived, one-time handoff code instead of exposing provider tokens to the browser.

See [privacy documentation](docs/privacy.md) and [security documentation](docs/security.md). Production deployment is intentionally limited to protected version tags.