import { ENV } from "./env.js";

export function getHost() {
  const domain = ENV.DOMAIN;
  if (domain === "localhost") {
    return `${domain}:${ENV.PORT}`;
  } else {
    return `${domain}`;
  }
}

export function getOrgin() {
  const domain = ENV.DOMAIN;
  if (domain === "localhost") {
    return `http://${getHost()}`;
  } else {
    return `https://${getHost()}`;
  }
}
