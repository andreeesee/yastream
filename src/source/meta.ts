import { ContentType } from "@stremio-addon/sdk";
import { Logger } from "../utils/logger.js";
import { Provider } from "./provider.js";

export interface ContentDetail {
  id: string;
  title: string;
  altTitle?: string;
  overview?: string;
  year: number;
  type: ContentType;
  imdbId?: string;
  tmdbId?: string | number;
  tvdbId?: string | number;
  kisskhId?: string;
  onetouchtvId?: string;
  idramaId?: string;
  season?: number;
  episode?: number;
  thumbnail?: string;
  logo?: string;
}

export abstract class BaseMeta {
  name: Provider;
  logger: Logger;
  constructor(name: Provider) {
    this.name = name;
    this.logger = new Logger(name);
  }
}
