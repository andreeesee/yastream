import axios from "axios";
import { Buffer } from "buffer";
import * as cheerio from "cheerio";
import {
  ContentType,
  MetaDetail,
  MetaPreview,
  MetaVideo,
  Stream,
  Subtitle,
} from "stremio-addon-sdk";
import { KisskhCatalog, Prefix } from "../lib/manifest.js";
import { cache } from "../utils/cache.js";
import { envGet } from "../utils/env.js";
import { matchTitle } from "../utils/fuse.js";
import { parseStreamInfo } from "../utils/info.js";
import { CountryCode, iso639FromCountryCode } from "../utils/language.js";
import { getSetDecryptedSubtitle } from "../utils/subtitle.js";
import { ContentDetail } from "./meta.js";
import { BaseProvider } from "./provider.js";

export interface SearchResult {
  id: string;
  title: string;
}
interface KisskhCatalogData {
  data: KisskhCatalog[];
}
interface KisskhCatalog {
  episodesCount: number;
  thumbnail: string;
  id: number;
  title: string;
}
interface KisskhDetail {
  id: string;
  thumbnail: string;
  title: string;
  country: string;
  description: string;
  episodesCount: number;
  releaseDate: string;
  episodes: Episode[];
}
interface Episode {
  id: number;
  number: number;
  sub: number;
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

enum KisskhCountry {
  CHINESE = "1",
  KOREAN = "2",
}

class KissKHScraperr extends BaseProvider {
  readonly baseUrl: string = "https://kisskh.co";
  readonly supportedPrefix: Prefix[] = [
    Prefix.IMDB,
    Prefix.TMDB,
    Prefix.TVDB,
    Prefix.KISSKH,
  ];
  private readonly pageSize = 20;
  private readonly subGuid: string = "VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp";
  private readonly viGuid: string = "62f176f3bb1b5b8e70e39932ad34a0c7";
  private readonly searchUrl: string =
    this.baseUrl + "/api/DramaList/Search?q=";
  private readonly exploreUrl: string = this.baseUrl + "/api/DramaList/List";
  private readonly detailUrl: string = this.baseUrl + "/api/DramaList/Drama/";
  private readonly episodeUrl: string =
    this.baseUrl + "/api/DramaList/Episode/{id}.png?kkey=";
  private readonly subUrl: string = this.baseUrl + "/api/Sub/{id}?kkey=";
  private readonly TYPE: Record<ContentType, string> = {
    series: "1",
    movie: "2",
    channel: "1",
    tv: "1",
  };
  private tokenJsCode: string | null = null;

  async searchCatalog(
    id: string,
    type: ContentType,
    search: string,
  ): Promise<MetaPreview[]> {
    const searchResult = await this.searchContent(search, type);
    return [];
  }

  /**
   * Search Last update of ongoing and complete
   * @param id
   * @param type
   * @param skip
   * @returns
   */
  async getCatalog(
    id: string,
    type: ContentType,
    skip?: number,
  ): Promise<MetaPreview[]> {
    let urls = [];
    let urlNum = 2;
    const page = this.getPage(this.pageSize, urlNum, skip);
    const t = this.TYPE[type];
    const ongoing = 1;
    const completed = 2;
    switch (id) {
      // case KisskhCatalog.MOVIE_KOREAN:
      case KisskhCatalog.SERIES_KOREAN:
        urls.push(
          this.exploreUrl +
            `?page=${page}&type=${t}&sub=0&country=${KisskhCountry.KOREAN}&status=${ongoing}&order=2`,
        );
        urls.push(
          this.exploreUrl +
            `?page=${page}&type=${t}&sub=0&country=${KisskhCountry.KOREAN}&status=${completed}&order=2`,
        );
        break;
      // case KisskhCatalog.MOVIE_CHINESE:
      case KisskhCatalog.SERIES_CHINESE:
        urls.push(
          this.exploreUrl +
            `?page=${page}&type=${t}&sub=0&country=${KisskhCountry.CHINESE}&status=${ongoing}&order=2`,
        );
        urls.push(
          this.exploreUrl +
            `?page=${page}&type=${t}&sub=0&country=${KisskhCountry.CHINESE}&status=${completed}&order=2`,
        );
        break;
      default:
        urls.push(
          this.exploreUrl +
            `?page=${page}&type=${t}&sub=0&country=${KisskhCountry.CHINESE}&status=${ongoing}&order=2`,
        );
        urls.push(
          this.exploreUrl +
            `?page=${page}&type=${t}&sub=0&country=${KisskhCountry.CHINESE}&status=${completed}&order=2`,
        );
        break;
    }
    const promises = urls.map(async (url) => {
      return axios.get(url);
    });
    const responses = await Promise.all(promises);
    const metas = responses.map((response) => {
      const data: KisskhCatalogData = response.data;
      const metas = data.data.map((kisskhMeta) => {
        const meta: MetaPreview = {
          id: `${Prefix.KISSKH}:${kisskhMeta.id}`,
          name: kisskhMeta.title,
          type: type,
          background: kisskhMeta.thumbnail,
          poster: kisskhMeta.thumbnail,
          posterShape: "landscape",
        };
        return meta;
      });
      return metas;
    });
    return metas.flat();
  }

  async getMeta(id: string, type: ContentType): Promise<MetaDetail | null> {
    const detail = await this.getDetail(id);
    const season = 1;
    const date = new Date(detail.releaseDate).toISOString();
    const videos: MetaVideo[] = detail.episodes.map((episode, index) => {
      const episodeNum = index + 1;
      if (type === "series") {
        return {
          id: `kisskh:${detail.id.toString()}:${season}:${episodeNum}`,
          released: date,
          title: detail.title,
          type: type,
          description: detail.title, // no description
          thumbnail: detail.thumbnail,
          background: detail.thumbnail,
          season: season,
          episode: index + 1,
        };
      } else {
        return {
          id: `${episode.id.toString()}:${season}:${episodeNum}`,
          released: date,
          title: detail.title,
          type: type,
          description: detail.title, // no description
          thumbnail: detail.thumbnail,
          background: detail.thumbnail,
        };
      }
    });
    const meta: MetaDetail = {
      id: `kisskh:${detail.id}`,
      name: detail.title,
      poster: detail.thumbnail,
      background: detail.thumbnail,
      posterShape: "landscape",
      type: type,
      description: detail.description,
      country: detail.country,
      released: date,
      videos: videos,
    };
    return meta;
  }

  async getStreams(
    title: string,
    type: ContentType,
    year?: number,
    season?: number,
    episode?: number,
    id?: string,
  ): Promise<Stream[] | null> {
    try {
      if (id) {
        const streamKey = `streams:kisskh:${id}`;
        const cacheStreams = cache.get(streamKey);
        if (cacheStreams) return cacheStreams;
      }
      const streamKey = `streams:kisskh:${title}:${type}:${year}:${season}:${episode}`;
      const subtitleKey = `subtitles:kisskh:${title}:${type}:${year}:${season}:${episode}`;
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
      const token = await this._getToken(episodeId, this.viGuid);
      const stream = await this._getStream(episodeId, token);
      const url = this._fixUrl(stream.Video!);
      let info;
      try {
        info = await parseStreamInfo(url);
      } catch (error) {
        this.logger.error(`Fail to parse stream info | ${error}`);
      }
      const formatTitle = this.formatStreamTitle(
        searchResult.title,
        year,
        season,
        episode,
        info,
      );
      const streams: Stream[] = [
        {
          url: url,
          name: "yastream",
          title: formatTitle,
          behaviorHints: {
            notWebReady: true,
            group: `yastream-kisskh`,
          },
        },
      ];

      const streamIdKey = `streams:kisskh:${episodeId}`;
      const subtitlesIdKey = `subtitles:kisskh:${episodeId}`;

      // Handle subtitles
      let subtitles = cache.get(subtitleKey);
      if (subtitles) {
        cache.set(subtitleKey, subtitles);
        cache.set(subtitlesIdKey, subtitles);
      } else {
        subtitles = cache.get(subtitlesIdKey);
        if (subtitles === null) {
          subtitles = await this._getSubtitles(episodeId);
          cache.set(subtitleKey, subtitles);
          cache.set(subtitlesIdKey, subtitles);
        } else {
          cache.set(subtitlesIdKey, subtitles);
        }
      }

      cache.set(streamKey, streams, 4 * 60 * 60 * 1000);
      cache.set(streamIdKey, streams, 4 * 60 * 60 * 1000);
      return streams;
    } catch (error: any) {
      this.logger.error(`Error | ${error.message}`);
    }
    return null;
  }

  async getSubtitles(content: ContentDetail): Promise<Subtitle[]> {
    return [];
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

  private async _getToken(episodeId: string, uid: string): Promise<string> {
    if (!this.tokenJsCode) {
      const { data: html } = await axios.get(this.baseUrl + "/index.html");
      const $ = cheerio.load(html);
      const scriptSrc = $('script[src*="common"]').attr("src");
      const { data: jsCode } = await axios.get(this.baseUrl + "/" + scriptSrc);
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
    const showList = showData as SearchResult[];
    const show = matchTitle(showList, title, year, season);
    const result: SearchResult = { id: show.id, title: show.title };
    this.logger.log(`SeriesId/MovieId | ${JSON.stringify(show.id)}`);
    return result;
  }

  public async getContent(episodeId: string): Promise<Stream[]> {
    // const token = await this._getToken(episodeId, this.viGuid);
    // const stream = await this._getStream(episodeId, token);
    const streamKey = `streams:kisskh:${episodeId}`;
    const cacheContent = cache.get(streamKey);
    return cacheContent;
  }

  public async getDetail(kisskhId: string): Promise<KisskhDetail> {
    const episodeResponse = await axios.get(`${this.detailUrl}${kisskhId}`, {
      headers: this.headers,
    });
    const episodesData: KisskhDetail = episodeResponse.data;
    return episodesData;
  }

  private async _getEpisode(seriesId: string, episode: number) {
    const detail = await this.getDetail(seriesId);
    const episodeCount = detail.episodesCount;
    if (!detail || episodeCount === undefined) {
      throw new Error("No episode data found");
    }
    const fallbackEpisodeData = detail.episodes[episodeCount - episode];
    const episodeData =
      detail.episodes.find((episodeData) => {
        return episodeData.number == episode;
      }) || fallbackEpisodeData;

    const episodeId = episodeData?.id;
    if (!episodeId) {
      throw new Error("Episode ID not found");
    }
    this.logger.log(`EpisodeId | ${episodeId}`);
    return episodeId.toString();
  }

  private async _getStream(episodeId: string, token: string) {
    const streamUrl = this.episodeUrl.replace("{id}", episodeId) + token;
    const streamResponse = await axios.get(`${streamUrl}`);
    const stream: StreamResponse = streamResponse.data;
    this.logger.log(`Stream Url | ${stream.Video}`);
    return stream;
  }

  private async _getSubtitles(episodeId: string): Promise<Subtitle[]> {
    const token = await this._getToken(episodeId, this.subGuid);
    const subtitleUrl = this.subUrl.replace("{id}", episodeId) + token;
    this.logger.log(`Subtitles Url | ${subtitleUrl}`);
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
        getSetDecryptedSubtitle(src);
        const url = this._createSubtitleUrl(src);
        subtitle.url = url;
      }
      subtitles.push(subtitle);
    }
    this.logger.log(`Subtitles found | ${subtitles.length}`);
    return subtitles;
  }

  private _needsDecryption(url: string): boolean {
    const lowerUrl = url.split("?")[0]?.toLowerCase() || url.toLowerCase();
    return lowerUrl.includes(".txt");
  }

  private _createSubtitleUrl(originalUrl: string): string {
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
