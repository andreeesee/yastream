import { ContentType, Stream } from "stremio-addon-sdk";
import { Logger } from "../lib/logger.js";

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
  protected name: string;
  protected logger: Logger;

  constructor(name: string) {
    this.name = name;
    this.logger = new Logger(this.name);
  }

  abstract getStreams(
    title: string,
    type: ContentType,
    year: number | null,
    season: number | null,
    episode: number | null,
  ): Promise<Stream[] | null>;
}
