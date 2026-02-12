// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
import { Manifest } from "stremio-addon-sdk";
import pkg from "../../package.json" with { type: "json" };

const manifest: Manifest = {
  id: "community.yastream",
  version: pkg.version,
  catalogs: [],
  resources: ["stream"],
  idPrefixes: ["tt", "tmdb:"],
  types: ["movie", "series"],
  name: "yastream",
  description:
    "Stream asian movies, series and dramas with kisskh. Powered by TMDB for metadata",
};

export default manifest;
