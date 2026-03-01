# v0.2.3 2026-03-01

- Add Vietnamese providers:
  1. kkphim (sometimes has AD, need Vietnamese VPN/Mediaflow-proxy)
  2. ophim
- Add some filter and display options
  1. Hide/Show nsfw content (if missing please report in discord)
  2. Hide/Show detail stream information (slower results when enabled)

# v0.2.3 2026-02-26

- Add cache size to env
- Add catalog selections

# v0.2.2 2026-02-25

- Improve caching mechanism, cache each url
- Add link to reddit and discord

# v0.2.1 2026-02-24

- Add tvdb search fallback to search with both main title and alt title | Thanks kodan2k
- Change poster shape to regular
- Add info to stream (duration, size, resolution)

# v0.2.0 2026-02-23

## Feature

- Migrate to Hono server
- Add configure page to select providers to use
- Add new provider idrama (suggested by a user)
- Add some catalogs for kisskh (no searching): New, Korean, and Chinese
- Add support for fallback search | Thanks [Historicalect62](https://www.reddit.com/r/StremioAddons/comments/1r36zji/comment/o5r5me7/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button), [zirotaz](https://www.reddit.com/r/StremioAddons/comments/1r36zji/comment/o5gycmo/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)
  1. Search with TMDB id if available
  2. Search with TVDB id if available

## Fix

- If the show appear on search, it should return | Thanks [kodan2k](https://www.reddit.com/r/StremioAddons/comments/1r36zji/comment/o5iwc7a/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)

# v0.1.6 2026-02-14

- Support encrypted subtitles

# v0.1.5

- Support subtitles for all devices with subtitle route
- Caching to reduce requests and improve performance

# v0.1.4

- Have subtitles for some devices with subtitles in stream route

# v0.1.3

- Improve title ranking system to get best title

# v0.1.2

- Switch to typescript

# v0.1.1

- Load stream from kisskh

# v0.1.0

- Connect to TMDB for title using IMDB id
