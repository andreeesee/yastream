// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
import {
  ContentType,
  Manifest,
  ManifestCatalog,
  ManifestExtra,
} from "stremio-addon-sdk";
import pkg from "../../package.json" with { type: "json" };
import { Provider } from "../source/provider.js";
import { getOrgin } from "../utils/domain.js";

export interface UserConfig {
  catalogs: string[];
  catalog: Provider[];
  stream: Provider[];
  nsfw: boolean;
  info: boolean;
}

export enum Prefix {
  IMDB = "tt",
  TMDB = "tmdb",
  TVDB = "tvdb",
  IDRAMA = "idrama",
  KISSKH = "kisskh",
}

export const defaultCatalogs = [
  `${Prefix.IDRAMA}.series.iDrama`,
  `${Prefix.IDRAMA}.series.Search`,

  `${Prefix.KISSKH}.series.Korean`,
  `${Prefix.KISSKH}.series.Chinese`,
  `${Prefix.KISSKH}.series.Search`,
  `${Prefix.KISSKH}.movie.Search`,
];

function buildCatalogMap(catalogs: string[] = defaultCatalogs) {
  const manifestCatalogs = catalogs.map((catalogId) => {
    const [prefix, type, name] = catalogId.split(".");
    const extra: ManifestExtra[] =
      name === "Search"
        ? [
            { name: "skip", isRequired: false },
            { name: "search", isRequired: true },
          ]
        : [{ name: "skip", isRequired: false }];
    const manifestCatalog: ManifestCatalog = {
      id: catalogId,
      type: type as ContentType,
      name: `[${pkg.name}] ${prefix} ${name}`,
      extra: extra,
    };
    return manifestCatalog;
  });
  const catalogMap = Object.groupBy(
    manifestCatalogs,
    (item) => (item.id.split(".")[0] || item.id) as Provider,
  );
  return catalogMap;
}

export const defaultConfig: UserConfig = {
  catalog: [Provider.KISSKH],
  stream: [Provider.KISSKH],
  catalogs: defaultCatalogs,
  nsfw: false,
  info: false,
};

const defaultManifest: Manifest = {
  id: "community.yastream",
  contactEmail: "tamthai.de@gmail.com",
  version: pkg.version,
  catalogs: [],
  resources: [],
  logo: `${getOrgin()}/img/yas.png`,
  idPrefixes: [
    Prefix.IMDB,
    Prefix.TMDB,
    Prefix.TVDB,
    Prefix.IDRAMA,
    Prefix.KISSKH,
  ],
  types: ["movie", "series"],
  name: "yastream",
  description:
    "Yet Another Stream. Stream asian dramas, series and movies directly with multiple providers. Support catalogs with languages selection. Powered by TMDB and TVDB for metadata",
  behaviorHints: {
    adult: false,
    p2p: false,
    configurable: true,
    configurationRequired: false,
  },
  config: [{ key: "config", type: "text" }],
};

export function buildManifest(config?: UserConfig) {
  config = config || defaultConfig;
  const config64 = btoa(JSON.stringify(config));
  const manifest = { ...defaultManifest };
  manifest.resources = [...defaultManifest.resources];
  manifest.catalogs = [...defaultManifest.catalogs];
  const catalogMap = buildCatalogMap(config.catalogs);

  if (config.catalog && config.catalog.length > 0) {
    manifest.resources.push("catalog");
    manifest.resources.push("meta");
    config.catalog.forEach((provider) => {
      const catalog = catalogMap[provider.toLowerCase() as Provider];
      if (catalog) {
        manifest.catalogs.push(...catalog);
      }
    });
  }

  if (config.stream && config.stream.length > 0) {
    manifest.resources.push("stream");
    manifest.resources.push("subtitles");
  }

  manifest.config = [{ key: "config", type: "text", default: config64 }];
  return manifest;
}
