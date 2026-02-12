import axios from "axios";
import { Buffer } from "buffer";
import * as cheerio from "cheerio";
import * as crypto from "crypto";
import Fuse from "fuse.js";
import { ContentType } from "stremio-addon-sdk";

interface Stream {
  url: string;
  type: ContentType;
  season?: number | null;
  episode?: number | null;
  name: string;
  description: string;
}

interface SearchResult {
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

interface DecryptionKeys {
  [key: string]: {
    key: Buffer;
    iv: Buffer;
  };
}

class KissKHScraperr {
  private baseUrl: string;
  private headers: Record<string, string>;
  private subGuid: string;
  private viGuid: string;
  private searchUrl: string;
  private seriesUrl: string;
  private episodeUrl: string;
  private DECRYPT_SUBS: DecryptionKeys;
  private tokenJsCode: string | null;

  constructor() {
    this.baseUrl = "https://kisskh.co/";
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "aplication/json",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    };
    this.subGuid = "VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp";
    this.viGuid = "62f176f3bb1b5b8e70e39932ad34a0c7";
    this.searchUrl = this.baseUrl + "api/DramaList/Search?q=";
    this.seriesUrl = this.baseUrl + "api/DramaList/Drama/";
    this.episodeUrl = this.baseUrl + "api/DramaList/Episode/{id}.png?kkey=";

    this.DECRYPT_SUBS = {
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
    this.tokenJsCode = null;
  }

  async getStreams(
    title: string,
    type: ContentType,
    year: number | null = null,
    season: number | null = null,
    episode: number | null = null,
  ): Promise<Stream[] | null> {
    try {
      const searchResult = await this.searchContent(title, type, year);
      if (!searchResult) {
        console.log("[KISSKH] No results");
        return null;
      }
      let episodeId = null;
      let token = null;
      let stream = null;
      switch (type) {
        case "series":
          if (!episode) {
            console.log("[KISSKH] Episode number required for series");
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
      return [
        {
          url: this._fixUrl(stream.Video!),
          type,
          season,
          episode,
          name: "yastream",
          description: "kisskh",
        },
      ];
    } catch (error: any) {
      console.error("[KISSKH] Error |", error.message);
    }
    return null;
  }

  async searchContent(
    title: string,
    type: ContentType,
    year: number | null = null,
  ): Promise<SearchResult | null> {
    switch (type) {
      case "series":
      case "movie":
        const shows = await this._getShows(title, year);
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
  ): Promise<SearchResult | null> {
    const searchResponse = await axios.get(`${this.searchUrl}${title}&type=0`, {
      headers: this.headers,
    });
    const showData = searchResponse.data;
    if (!showData) {
      return null;
    }
    const showList = showData.slice(0, 15) as SearchResult[];
    const matchTitle = year ? `${title} ${year}` : title;
    const show = this._bestMatch(showList, matchTitle);
    const result: SearchResult = { id: show.id, title: show.title };
    console.log(`[KISSKH] SeriesId/MovieId | ${JSON.stringify(show.id)}`);
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
      throw new Error("[KISSKH] No episode data found");
    }
    const episodeData = episodeDatas[episodeCount - episode];
    const episodeId = episodeData?.id;
    if (!episodeId) {
      throw new Error("[KISSKH] Episode ID not found");
    }
    console.log(`[KISSKH] EpisodeId | ${episodeId}`);
    return episodeId;
  }

  private async _getStream(episodeId: string, token: string) {
    const streamUrl = this.episodeUrl.replace("{id}", episodeId) + token;
    const streamResponse = await axios.get(`${streamUrl}`);
    const stream: StreamResponse = streamResponse.data;
    console.log(`[KISSKH] Stream | ${stream.Video}`);
    return stream;
  }

  private _fixUrl(url: string): string {
    if (!url.startsWith("http")) {
      return `https:${url}`;
    }
    return url;
  }

  private _bestMatch(results: SearchResult[], title: string): SearchResult {
    const options = {
      keys: ["title"],
      includeScore: true,
      threshold: 0.4, // 0 is none, 1 is all
    };

    const fuse = new Fuse(results, options);
    const searchResult = fuse.search(title);

    if (searchResult.length === 0) {
      throw new Error("No search results found");
    }

    const firstResult = searchResult[0]!;
    console.log(`[KISSKH] Match | ${firstResult.item.title}`);
    return firstResult.item;
  }
}

export default KissKHScraperr;
