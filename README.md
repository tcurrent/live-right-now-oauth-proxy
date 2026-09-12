# live-right-now-oauth-proxy

A lightweight, serverless OAuth 2.0 authentication proxy built to support [Live Right Now](https://github.com/tcurrent/live-right-now) RuneLite plugin. It safely handles Twitch and Kick authorization code exchanges by keeping client secrets on a Cloudflare Worker while using GitHub Pages to facilitate the browser-to-client redirect flow.