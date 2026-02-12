// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
import { Manifest } from "stremio-addon-sdk";

const manifest: Manifest = {
  id: "community.yastream",
  version: "0.0.1",
  catalogs: [],
  resources: ["stream"],
  idPrefixes: ["tt", "tmdb:"],
  types: ["movie", "series"],
  name: "yastream",
  description:
    "Stream asian movies, series and dramas with kisskh. Powered by TMDB for metadata",
};

export default manifest;
