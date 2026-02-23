import {
  ContentType,
  MetaDetail,
  MetaPreview,
  Stream,
  Subtitle,
} from "stremio-addon-sdk";
import { Logger } from "../utils/logger.js";
import { getDisplayResolution, StreamInfo } from "../utils/info.js";
import { Prefix } from "../lib/manifest.js";
import { ContentDetail } from "./meta.js";

export enum Provider {
  KISSKH = "KISSKH",
  IDRAMA = "IDRAMA",
  TMDB = "TMDB",
  TVDB = "TVDB",
}

export abstract class BaseProvider {
  abstract baseUrl: string;
  protected headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept: "aplication/json",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  };
  protected logger: Logger;
  name: Provider;
  abstract supportedPrefix: Prefix[];

  constructor(name: Provider) {
    this.name = name;
    this.logger = new Logger(name);
  }

  abstract searchCatalog(
    id: string,
    type: ContentType,
    search: string,
  ): Promise<MetaPreview[]>;

  abstract getCatalog(
    id: string,
    type: ContentType,
    skip?: number,
  ): Promise<MetaPreview[]>;

  abstract getMeta(id: string, type: ContentType): Promise<MetaDetail | null>;

  abstract getStreams(
    title: string,
    type: ContentType,
    year?: number,
    season?: number,
    episode?: number,
    id?: string,
  ): Promise<Stream[] | null>;

  abstract getSubtitles(content: ContentDetail): Promise<Subtitle[]>;

  /**
   * @param pageSize
   * @param skip
   * @returns page from 1
   */
  getPage(pageSize: number, skip?: number) {
    return skip ? Math.ceil(skip / pageSize) + 1 : 1;
  }

  formatStreamTitle(
    title: string,
    year?: number,
    season?: number,
    episode?: number,
    info?: StreamInfo,
  ) {
    let titleWithYear = `${title} ${year}`;
    if (year) {
      titleWithYear = title.includes(year.toString()) ? title : titleWithYear;
    }

    const displayResolution = info?.resolution
      ? getDisplayResolution(info?.resolution)
      : "";
    const displaySize = info?.size ? `${info.size.toFixed(2)} GB ` : "";
    const displayHours = info?.hours ? `${info.hours} hours` : "";
    const displayMinutes = info?.minutes ? `${info.minutes} minutes` : "";
    const displayTime = `${displayHours} ${displayMinutes}`;

    const formatTitle = season
      ? `${title} S${season.toString().padStart(2, "0")}E${episode?.toString().padStart(2, "0")}`
      : titleWithYear;
    const titleInfo = info
      ? `${formatTitle}\n${displayTime.trim()}\n${displaySize}${displayResolution.trim()}`
      : formatTitle;
    return titleInfo;
  }
}
