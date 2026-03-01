import { envGet } from "./env.js";

export function getProxyLink(url: string) {
  const mediaflowproxyUrl = envGet("MEDIAFLOW_PROXY_URL");
  if (!mediaflowproxyUrl) return url;
  const mediaflowproxyPass = envGet("MEDIAFLOW_PROXY_PASSWORD");
  const proxyUrl = `${mediaflowproxyUrl}/proxy/hls/manifest.m3u8?d=${encodeURIComponent(url)}&api_password=${mediaflowproxyPass}`;
  return proxyUrl;
}
