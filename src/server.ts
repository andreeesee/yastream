#!/usr/bin/env node

import pkg from "stremio-addon-sdk";
import addonInterface from "./lib/addon.js";
const { serveHTTP } = pkg;

serveHTTP(addonInterface, { port: Number(process.env.PORT) || 55913 });

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
