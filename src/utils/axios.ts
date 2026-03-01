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
    logger.error(`Fail to get | ${url}`);
  }
  return null;
}
