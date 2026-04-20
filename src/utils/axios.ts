import axios, { AxiosError, AxiosRequestConfig, HttpStatusCode } from "axios";
import rateLimit from "axios-rate-limit";
import https from "https";
import { cache } from "./cache.js";
import { ENV } from "./env.js";
import { Logger } from "./logger.js";

// process.setMaxListeners(20);
// EventEmitter.defaultMaxListeners = 15;

function createClient(
  maxRequests: number,
  duration: string = "1s",
  headers: Record<string, string> = {},
) {
  const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 20,
    maxFreeSockets: 10,
    timeout: 10000,
    scheduling: "fifo",
  });
  const instance = axios.create({ httpsAgent, headers });
  return rateLimit(instance, {
    limits: [{ maxRequests, duration }],
  });
}

const defaultClient = createClient(40);
const kisskhClient = createClient(10, "2s", {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept: "application/json",
});
const onetouchtvHost = Buffer.from("YXBpMy5kZXZjb3JwLm1l=", "base64").toString(
  "utf-8",
);
const onetouchtvClient = createClient(20, "2s", {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept: "*/*",
  Origin: "https://onetouchtv.xyz",
  Referer: "https://onetouchtv.xyz",
});

function getClient(url: string) {
  if (ENV.KISSKH_URLS.some((kisskhUrl) => url.includes(kisskhUrl))) {
    return kisskhClient;
  }
  if (url.includes(onetouchtvHost)) {
    return onetouchtvClient;
  }
  return defaultClient;
}

const logger = new Logger("AXIOS");
export async function axiosGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  cacheMs: number = 2 * 60 * 60 * 1000,
): Promise<T | null> {
  const urlKey = `url:${url}`;
  const cacheData = cache.get(urlKey);
  if (cacheData) return cacheData;
  let lastError: AxiosError | unknown;
  const http = getClient(url);
  for (let attempt = 1; attempt <= ENV.RETRY_ATTEMPTS; attempt++) {
    try {
      const data = (await http.get(url, { timeout: 5000, ...config })).data;
      cache.set(urlKey, data, cacheMs);
      return data as T;
    } catch (error: AxiosError | unknown) {
      lastError = error;
      const status = error instanceof AxiosError && error.response?.status;
      let isRateLimit = status === HttpStatusCode.TooManyRequests;
      // Onetouchtv returns 404 when rate limited;
      if (http === onetouchtvClient) {
        logger.log(
          `Status code ${status} from onetouchtv, treat as rate limit`,
        );
        isRateLimit = isRateLimit || status === HttpStatusCode.NotFound;
        logger.log(`Is rate limit: ${isRateLimit} | ${url}`);
      }
      if (isRateLimit && attempt < ENV.RETRY_ATTEMPTS) {
        logger.log(`Retry ${attempt}/${ENV.RETRY_ATTEMPTS} | ${url}`);
        const retryAfter =
          ENV.RETRY_DELAY_MS * attempt + Math.random() * ENV.RETRY_JITTER_MS;
        await new Promise((r) => setTimeout(r, retryAfter));
      } else if (!isRateLimit) {
        break;
      }
    }
  }
  logger.error(
    `Fail GET | ${url} ${lastError instanceof AxiosError ? JSON.stringify(lastError) : lastError}`,
  );
  return null;
}

export async function axiosHead<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<boolean> {
  const urlKey = `head:url:${url}`;
  const cacheData = cache.get(urlKey);
  if (cacheData) return cacheData;
  let lastError: AxiosError | unknown;
  for (let attempt = 1; attempt <= ENV.RETRY_ATTEMPTS; attempt++) {
    try {
      await defaultClient.head(url, { timeout: 5000, ...config });
      cache.set(urlKey, true, 24 * 60 * 60 * 1000);
      return true;
    } catch (error) {
      lastError = error;
      const isRateLimit =
        error instanceof AxiosError &&
        error.response?.status === HttpStatusCode.TooManyRequests;
      if (isRateLimit && attempt < ENV.RETRY_ATTEMPTS) {
        logger.log(`Retry ${attempt}/${ENV.RETRY_ATTEMPTS} HEAD | ${url}`);
        const retryAfter =
          ENV.RETRY_DELAY_MS * attempt + Math.random() * ENV.RETRY_JITTER_MS;
        await new Promise((r) => setTimeout(r, retryAfter));
      } else if (!isRateLimit) {
        break;
      }
    }
  }
  logger.error(`Fail HEAD | ${url}, ${lastError}`);
  cache.set(urlKey, false, 4 * 60 * 60 * 1000);
  return false;
}
