import { ContentType } from "stremio-addon-sdk";
import { Logger } from "../utils/logger.js";
import { Provider } from "./provider.js";

export interface ContentDetail {
  id?: string;
  title: string;
  altTitle?: string;
  overview?: string;
  year: number;
  type: ContentType;
  tmdbId?: string | number;
  tvdbId?: string | number;
  season?: number;
  episode?: number;
  thumbnail?: string;
}

export abstract class BaseMeta {
  name: Provider;
  logger: Logger;
  constructor(name: Provider) {
    this.name = name;
    this.logger = new Logger(name);
  }
}
