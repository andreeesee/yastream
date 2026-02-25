import axios, { AxiosRequestConfig } from "axios";
import { cache } from "./cache.js";

export async function axiosGet(
  url: string,
  config?: AxiosRequestConfig,
): Promise<any> {
  const urlKey = `url:${url}`;
  const cacheData = cache.get(urlKey);
  if (cacheData) return cacheData;
  const data = (await axios.get(url, config)).data;
  cache.set(urlKey, data);
  return data;
}
