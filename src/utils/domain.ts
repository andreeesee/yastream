import { envGet } from "./env.js";

export function getHost() {
  const domain = envGet("DOMAIN");
  if (domain === "localhost") {
    return `${domain}:${envGet("PORT")}`;
  } else {
    return `${domain}`;
  }
}

export function getOrgin() {
  const domain = envGet("DOMAIN");
  if (domain === "localhost") {
    return `http://${domain}:${envGet("PORT")}`;
  } else {
    return `https://${domain}`;
  }
}
