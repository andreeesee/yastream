# yastream

Yet Another Stream.

A stremio addon to stream asian dramas, series and movies from multiple providers.
Powered by [TMDB](https://themoviedb.org), [TVDB](https://www.thetvdb.com) for metadata.

# How to use

There are multiple way to start using this addon.
The default config is catalog and stream from one provider.

## Directly from the website

1. Visit [https://yastream.tamthai.de](https://yastream.tamthai.de)
   (or [https://yastream-dev.tamthai.de](https://yastream-dev.tamthai.de) for the nightly version).
2. Configure catalog and stream providers.
3. Install with your preferred method.

## Search from stremio addon

1. In stremio -> addon.
2. Select Community Addons and search for 'yastream' or 'asian'.
3. Install with default config or configure to add or remove providers.

# Self-host / Development

## Self-host

To run this addon you can run the stable version (latest) with the docker-compose.yaml file provided:

```yaml
services:
  yastream:
    image: tamthai/yastream:latest # change tag to dev for nightly build
    container_name: yastream
    ports:
      - 55913:55913
    env_file: .env
    restart: unless-stopped
```

Or with docker run:

```sh
docker run -d \
  --name yastream \
  -p 55913:55913 \
  --env-file .env \
  --restart unless-stopped \
  tamthai/yastream:latest
```

The .env file require only two key TMDB and TVDB.
The other value are optional with the default value written after | e.g. default PORT is 55913.

```env
# REQUIRED
# The Movie Database Read Only Access Key. To get title to search on other providers | eySomething
TMDB_API_KEY=
# TVDB key. For series with no imdb id | eySomething
TVDB_API_KEY=

# OPTIONAL
# Domain that the addon serve | localhost
DOMAIN=
# Running port | 55913
PORT=
# Debug-key for https://host/dashboard?key=DEBUG_KEY | debug-key
DEBUG_KEY=
# Log level TRACE -> DEBUG -> INFO -> WARN -> ERROR -> NONE | INFO
LOG_LEVEL=INFO
```

## Development

To help with adding more providers, you can directly contact me.

### Start the source

Install the dependencies

```sh
pnpm i
```

Start the development server (no hot reload)

```sh
pnpm dev
```

Build to deploy as a standalone server

```sh
pnpm build
```

Run the standalone server

```sh
pnpm start
```

# Support

If you find this addon useful, you can help by:

- Star the project or [star the addon](https://stremio-addons.net/addons/yastream)
- Submitting useful feedback, bugs or feature suggestions
- Supporting through Ko-fi

# Inspiration

- [udb](https://github.com/Prudhvi-pln/udb)
- [kiss-dl](https://github.com/debakarr/kisskh-dl)
- [webstremr](https://github.com/webstreamr/webstreamr)
