import axios from "axios";
import { Buffer } from "buffer";
import * as cheerio from "cheerio";
import * as crypto from "crypto";
import { ContentType, Stream, Subtitle } from "stremio-addon-sdk";
import { cache } from "../utils/cache.js";
import { envGet } from "../utils/env.js";
import { filterShow as bestMatch } from "../utils/fuse.js";
import { CountryCode, iso639FromCountryCode } from "../utils/language.js";
import { BaseProvider } from "./provider.js";
import { getDecryptedSubtitle } from "../utils/subtitle.js";

export interface SearchResult {
  id: string;
  title: string;
}

interface EpisodeData {
  id: string;
  [key: string]: any;
}

interface StreamResponse {
  Video: string;
  [key: string]: any;
}
interface SubResponse {
  src: string;
  label: string;
  land: string;
  default: boolean;
}

interface DecryptionKeys {
  [key: string]: {
    key: Buffer;
    iv: Buffer;
  };
}

class KissKHScraperr extends BaseProvider {
  readonly baseUrl: string = "https://kisskh.co/";
  private subGuid: string = "VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp";
  private viGuid: string = "62f176f3bb1b5b8e70e39932ad34a0c7";
  private searchUrl: string = this.baseUrl + "api/DramaList/Search?q=";
  private seriesUrl: string = this.baseUrl + "api/DramaList/Drama/";
  private episodeUrl: string =
    this.baseUrl + "api/DramaList/Episode/{id}.png?kkey=";
  private subUrl: string = this.baseUrl + "api/Sub/{id}?kkey=";
  private DECRYPT_SUBS: DecryptionKeys = {
    txt: {
      key: Buffer.from("8056483646328763"),
      iv: Buffer.from("6852612370185273"),
    },
    txt1: {
      key: Buffer.from("AmSmZVcH93UQUezi"),
      iv: Buffer.from("ReBKWW8cqdjPEnF6"),
    },
    default: {
      key: Buffer.from("sWODXX04QRTkHdlZ"),
      iv: Buffer.from("8pwhapJeC4hrS9hO"),
    },
  };
  private tokenJsCode: string | null = null;

  async getStreams(
    title: string,
    type: ContentType,
    year: number | null = null,
    season: number | null = null,
    episode: number | null = null,
  ): Promise<Stream[] | null> {
    try {
      const streamKey = `streams:${title}:${type}:${year}:${season}:${episode}`;
      const subtitleKey = `subtitles:${title}:${type}:${year}:${season}:${episode}`;
      const cacheStreams = cache.get(streamKey);
      if (cacheStreams !== null) {
        return cacheStreams;
      }

      const searchResult = await this.searchContent(title, type, year, season);
      if (!searchResult) {
        this.logger.log("No results");
        return null;
      }
      let episodeId = null;
      let token = null;
      let stream = null;
      switch (type) {
        case "series":
          if (!episode) {
            this.logger.log("Episode number required for series");
            return null;
          }
          episodeId = await this._getEpisode(searchResult.id, episode);
          break;
        default:
          episodeId = await this._getEpisode(searchResult.id, 1);
          break;
      }
      token = await this._getToken(episodeId, this.viGuid);
      stream = await this._getStream(episodeId, token);

      // Handle subtitles
      let subtitles = cache.get(subtitleKey);
      if (subtitles == null) {
        subtitles = await this._getSubtitles(episodeId);
        cache.set(subtitleKey, subtitles);
      }

      const formatTitle = season
        ? `${searchResult.title} S${season.toString().padStart(2, "0")}E${episode?.toString().padStart(2, "0")}`
        : `${searchResult.title} ${year}`;
      const streams: Stream[] = [
        {
          url: this._fixUrl(stream.Video!),
          name: "yastream",
          title: formatTitle,
          behaviorHints: {
            notWebReady: true,
            group: `yastream-kisskh`,
          },
        },
      ];
      cache.set(streamKey, streams, 2 * 60 * 60 * 1000);
      return streams;
    } catch (error: any) {
      this.logger.error(`Error | ${error.message}`);
    }
    return null;
  }

  async searchContent(
    title: string,
    type: ContentType,
    year: number | null = null,
    season: number | null = null,
  ): Promise<SearchResult | null> {
    switch (type) {
      case "series":
      case "movie":
        const shows = await this._getShows(title, year, season);
        return shows;
      default:
        return null;
    }
  }

  private _decrypt(data: string, key: Buffer, iv: Buffer): string {
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
    let decrypted = decipher.update(data, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  private async _getToken(episodeId: string, uid: string): Promise<string> {
    if (!this.tokenJsCode) {
      const { data: html } = await axios.get(this.baseUrl + "index.html");
      const $ = cheerio.load(html);
      const scriptSrc = $('script[src*="common"]').attr("src");
      const { data: jsCode } = await axios.get(this.baseUrl + scriptSrc);
      this.tokenJsCode = jsCode;
    }

    const sandbox = `
            ${this.tokenJsCode};
            _0x54b991(${episodeId}, null, "2.8.10", "${uid}", 4830201, "kisskh", "kisskh", "kisskh", "kisskh", "kisskh", "kisskh");
        `;

    try {
      const token = eval(sandbox);
      if (!token) {
        throw new Error(`[KISSKH] Token generation failed`);
      }
      return token;
    } catch (e) {
      throw new Error(`[KISSKH] Token generation failed | ${e}`);
    }
  }

  private async _getShows(
    title: string,
    year: number | null = null,
    season: number | null = null,
  ): Promise<SearchResult | null> {
    const searchResponse = await axios.get(`${this.searchUrl}${title}&type=0`, {
      headers: this.headers,
    });
    const showData = searchResponse.data;
    if (!showData) {
      return null;
    }
    const showList = showData.slice(0, 20) as SearchResult[]; // get top 20
    const show = bestMatch(showList, title, year, season);
    const result: SearchResult = { id: show.id, title: show.title };
    this.logger.log(`SeriesId/MovieId | ${JSON.stringify(show.id)}`);
    return result;
  }

  private async _getEpisode(seriesId: string, episode: number) {
    const episodeResponse = await axios.get(`${this.seriesUrl}${seriesId}`, {
      headers: this.headers,
    });
    const episodeDatas = episodeResponse.data?.episodes as
      | EpisodeData[]
      | undefined;
    const episodeCount = episodeResponse.data?.episodesCount;
    if (!episodeDatas || episodeCount === undefined) {
      throw new Error("No episode data found");
    }
    const episodeData = episodeDatas[episodeCount - episode];
    const episodeId = episodeData?.id;
    if (!episodeId) {
      throw new Error("Episode ID not found");
    }
    this.logger.log(`EpisodeId | ${episodeId}`);
    return episodeId;
  }

  private async _getStream(episodeId: string, token: string) {
    const streamUrl = this.episodeUrl.replace("{id}", episodeId) + token;
    const streamResponse = await axios.get(`${streamUrl}`);
    const stream: StreamResponse = streamResponse.data;
    this.logger.log(`Stream URL | ${stream.Video}`);
    return stream;
  }

  private async _getSubtitles(episodeId: string): Promise<Subtitle[]> {
    const token = await this._getToken(episodeId, this.subGuid);
    const subtitleUrl = this.subUrl.replace("{id}", episodeId) + token;
    this.logger.log(`Subtitles URL | ${subtitleUrl}`);
    const response = await axios.get(`${subtitleUrl}`);
    const subtitleDatas: SubResponse[] = response.data;
    const subtitles: Subtitle[] = [];
    for (const [index, subtitleData] of subtitleDatas.entries()) {
      const lang = iso639FromCountryCode(subtitleData.land as CountryCode);
      const src = subtitleData.src;
      const subtitle: Subtitle = {
        id: index.toString(),
        lang: lang,
        url: src,
      };
      if (this._needsDecryption(src)) {
        // set to global cache
        getDecryptedSubtitle(src);
        const url = this._getProxyUrl(src);
        subtitle.url = url;
      }
      subtitles.push(subtitle);
    }
    this.logger.log(`Subtitles found | ${subtitles.length}`);
    return subtitles;
  }

  private _needsDecryption(url: string): boolean {
    const lowerUrl = url.split("?")[0]?.toLowerCase() || url.toLowerCase();
    return lowerUrl.endsWith(".txt") || lowerUrl.endsWith(".txt1");
  }

  private _getProxyUrl(originalUrl: string): string {
    const domain = envGet("DOMAIN") || "localhost";
    const port = envGet("PORT") || "55913";
    const protocol = domain === "localhost" ? "http" : "https";
    const baseUrl =
      domain === "localhost"
        ? `${protocol}://${domain}:${port}`
        : `${protocol}://${domain}`;
    return `${baseUrl}/subtitle/${originalUrl}`;
  }

  private _fixUrl(url: string): string {
    if (!url.startsWith("http")) {
      return `https:${url}`;
    }
    return url;
  }
}

export default KissKHScraperr;
