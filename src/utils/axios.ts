import axios, { AxiosRequestConfig } from "axios";
import { cache } from "./cache.js";
import { Logger } from "./logger.js";
import rateLimit from "axios-rate-limit";

const http = rateLimit(axios.create(), {
  limits: [
    { maxRequests: 40, duration: "1s" },
  ],
});
const logger = new Logger("AXIOS");
export async function axiosGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  cacheMs: number = 2 * 60 * 60 * 1000,
): Promise<T | null> {
  const urlKey = `url:${url}`;
  const cacheData = cache.get(urlKey);
  if (cacheData) return cacheData;
  try {
    const data = (await http.get(url, { timeout: 10000, ...config })).data;
    cache.set(urlKey, data, cacheMs);
    return data as T;
  } catch (error) {
    logger.error(`Fail GET | ${url}`);
  }
  return null;
}

export async function axiosHead<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<boolean> {
  const urlKey = `head:url:${url}`;
  const cacheData = cache.get(urlKey);
  if (cacheData) return cacheData;
  try {
    await http.head(url, { timeout: 5000, ...config });
    cache.set(urlKey, true, 24 * 60 * 60 * 1000);
    return true;
  } catch (error) {
    logger.error(`Fail HEAD | ${url}, ${error}`);
  }
  cache.set(urlKey, false, 4 * 60 * 60 * 1000);
  return false;
}
