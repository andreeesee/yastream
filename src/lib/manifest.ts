// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
import { Manifest } from "stremio-addon-sdk";
import pkg from "../../package.json" with { type: "json" };
import { envGet } from "./env.js";

const manifest: Manifest = {
  id: "community.yastream",
  version: pkg.version,
  catalogs: [],
  resources: ["stream"],
  logo: `https://${envGet("DOMAIN")}/img/yas.png`,
  idPrefixes: ["tt", "tmdb:"],
  types: ["movie", "series"],
  name: "yastream",
  description:
    "Yet Another Stream. Stream asian movies, series and dramas directly with kisskh. Powered by TMDB for metadata",
};

export default manifest;
