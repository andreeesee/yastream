// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
  id: "community.AsiaView",
  version: "0.0.1",
  catalogs: [],
  resources: [
    {
      name: "stream",
      types: ["movie", "series"],
      idPrefixes: ["tt"],
    },
  ],
  types: ["movie", "series"],
  name: "AsiaView",
  description:
    "Stream asian movies, series and dramas with kisskh - Powered by TMDB",
};

module.exports = manifest;
