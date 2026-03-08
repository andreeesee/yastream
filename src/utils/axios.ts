import axios, { AxiosRequestConfig } from "axios";
import { cache } from "./cache.js";
import { Logger } from "./logger.js";

const logger = new Logger("AXIOS");
export async function axiosGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T | null> {
  const urlKey = `url:${url}`;
  const cacheData = cache.get(urlKey);
  if (cacheData) return cacheData;
  try {
    const data = (await axios.get(url, config)).data;
    cache.set(urlKey, data);
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
    await axios.head(url, config);
    cache.set(urlKey, true, 8 * 60 * 60 * 1000);
    return true;
  } catch (error) {
    logger.error(`Fail HEAD | ${url}, ${error}`);
  }
  cache.set(urlKey, false, 4 * 60 * 60 * 1000);
  return false;
}
