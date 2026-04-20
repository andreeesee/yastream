import {
  CatalogHandlerArgs,
  ContentType,
  MetaDetail,
  MetaPreview,
  Stream,
  Subtitle,
} from "@stremio-addon/sdk";
import CryptoJS from "crypto-js";
import { Prefix, UserConfig } from "../lib/manifest.js";
import { ContentDetail } from "./meta.js";
import { BaseProvider } from "./provider.js";

// Example base scraper class
export class BaseScraper extends BaseProvider {
  supportedPrefix: Prefix[] = [Prefix.IMDB, Prefix.TMDB, Prefix.TVDB];
  baseUrl = "https://example.com";

  async searchCatalog(
    args: CatalogHandlerArgs,
    config: UserConfig,
  ): Promise<MetaPreview[]> {
    throw new Error("Method not implemented.");
  }
  async getCatalog(
    args: CatalogHandlerArgs,
    config: UserConfig,
  ): Promise<MetaPreview[]> {
    throw new Error("Method not implemented.");
  }
  async getMeta(
    content: ContentDetail,
    type: ContentType,
  ): Promise<MetaDetail | null> {
    throw new Error("Method not implemented.");
  }
  async getStreams(
    content: ContentDetail,
    config: UserConfig,
  ): Promise<Stream[]> {
    throw new Error("Method not implemented.");
  }
  getSubtitles(content: ContentDetail): Promise<Subtitle[]> {
    throw new Error("Method not implemented.");
  }
}
