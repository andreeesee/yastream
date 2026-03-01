import axios from "axios";
import * as cheerio from "cheerio";
import {
  Args,
  ContentType,
  MetaDetail,
  MetaPreview,
  MetaVideo,
  Stream,
  Subtitle,
} from "stremio-addon-sdk";
import { Prefix, UserConfig } from "../lib/manifest.js";
import { axiosGet } from "../utils/axios.js";
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
  episodesCount: number;
  thumbnail: string;
}

interface KisskhCatalogData {
  data: KisskhCatalogItem[];
}
interface KisskhCatalogItem {
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

const KISSKH_COUNTRY: Record<string, string> = {
  Chinese: "1",
  Korean: "2",
  Japanese: "3",
  Hongkong: "4",
  Thai: "5",
  US: "6",
  Taiwanese: "7",
  Philippine: "8",
};

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
  private nsfwIds = new Set([
    12519, 12518, 12517, 12516, 12515, 12514, 12513, 12510, 12504, 12503, 12495,
    12491, 12480, 12413, 12378, 12332, 12331, 12330, 12314, 12285, 12284, 12200,
    12179, 12177, 12127, 12125, 12124, 12123, 12106, 11915, 11834, 11782, 11519,
    11518, 11517, 11511, 11509, 11436, 10942, 10761,
  ]);

  async searchCatalog(args: Args, config: UserConfig): Promise<MetaPreview[]> {
    const { id, type, extra } = args;
    const search = extra.search;
    this.logger.log(`Search | ${search}`);
    const searchResults = await this.searchContent(
      search,
      type,
      undefined,
      undefined,
      false,
    );
    if (!searchResults[0]) return [];
    const filterResults = searchResults.filter((result) => {
      if (type == "series") return result.episodesCount > 1;
      else return result.episodesCount == 1;
    });
    filterResults.forEach((result) => {
      if (!config.nsfw && this.nsfwIds.has(parseInt(result.id))) {
        result.thumbnail = this.nsfwDefaultThumbnail;
      }
    });
    const metas = filterResults.map((detail) => {
      const meta: MetaPreview = {
        id: `${Prefix.KISSKH}:${detail.id}`,
        name: detail.title,
        type: type,
        background: detail.thumbnail,
        poster: detail.thumbnail,
        posterShape: "regular",
      };
      return meta;
    });
    return metas;
  }

  /**
   * Search Last update of ongoing and complete
   * @param id
   * @param type
   * @param skip
   * @returns
   */
  async getCatalog(args: Args, config: UserConfig): Promise<MetaPreview[]> {
    const { id, type, extra } = args;
    const skip = extra.skip;
    let t = this.TYPE[type];
    const ongoing = 1;
    const completed = 2;
    const holliwood = "4";
    const [prefix, typeStr, countryName] = id.split(".");
    if (countryName == "US") {
      t = holliwood;
    }
    const country = countryName
      ? KISSKH_COUNTRY[countryName]
      : KISSKH_COUNTRY["Korean"];
    const pageSize = 20;
    let urls = [];
    let urlNum = 1;
    let page = this.getPage(pageSize, skip, urlNum);
    if (type === "series" || t === holliwood) {
      urlNum = 2;
      page = this.getPage(pageSize, skip, urlNum);
      urls.push(
        this.exploreUrl +
          `?page=${page}&type=${t}&sub=0&country=${country}&status=${ongoing}&order=2`,
      );
    }
    urls.push(
      this.exploreUrl +
        `?page=${page}&type=${t}&sub=0&country=${country}&status=${completed}&order=2`,
    );
    const promises = urls.map(async (url) => {
      this.logger.log(`GET catalog | ${url}`);
      return axiosGet<KisskhCatalogData>(url);
    });
    let datas = await Promise.all(promises);
    const metas = datas
      .map((data) => {
        if (!data) return [];
        const metas = data.data.map((kisskhMeta) => {
          let thumbnail = kisskhMeta.thumbnail;
          if (!config.nsfw && this.nsfwIds.has(kisskhMeta.id)) {
            thumbnail = this.nsfwDefaultThumbnail;
          }
          const meta: MetaPreview = {
            id: `${Prefix.KISSKH}:${kisskhMeta.id}`,
            name: kisskhMeta.title,
            type: type,
            background: kisskhMeta.thumbnail,
            poster: thumbnail,
            posterShape: "regular",
          };
          return meta;
        });
        return metas;
      })
      .flat();
    return metas;
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
          description: detail.description,
          thumbnail: detail.thumbnail,
          background: detail.thumbnail,
          season: season,
          episode: index + 1,
        };
      } else {
        return {
          id: `kisskh:${detail.id.toString()}:${season}:${episodeNum}`,
          released: date,
          title: detail.title,
          type: type,
          description: detail.description,
          thumbnail: detail.thumbnail,
          background: detail.thumbnail,
          season: season,
          episode: index + 1,
        };
      }
    });
    const meta: MetaDetail = {
      id: `kisskh:${detail.id}`,
      name: detail.title,
      poster: detail.thumbnail,
      background: detail.thumbnail,
      posterShape: "regular",
      type: type,
      description: detail.description,
      country: detail.country,
      released: date,
      videos: videos,
    };
    return meta;
  }

  async getStreams(
    content: ContentDetail,
    config: UserConfig,
  ): Promise<Stream[]> {
    const { title, type, year, season, episode, id, altTitle } = content;
    try {
      if (id) {
        const streamKey = `streams:kisskh:${type}:${id}:${season}:${episode}`;
        const cacheStreams = cache.get(streamKey);
        if (cacheStreams) return cacheStreams;
      }
      const streamKey = `streams:kisskh:${type}:${id}:${season}:${episode}`;
      const cacheStreams = cache.get(streamKey);
      if (cacheStreams !== null) {
        return cacheStreams;
      }

      const searchResult = await this.searchContent(
        title,
        type,
        year,
        season,
        true,
        altTitle,
      );
      if (!searchResult[0]) {
        this.logger.log("No results");
        return [];
      }
      const streams = await this.generateStreamsAndSubtitles(
        searchResult[0],
        content,
        config,
      );
      if (streams) cache.set(streamKey, streams, 4 * 60 * 60 * 1000);
      return streams;
    } catch (error: any) {
      this.logger.error(`Error | ${error.message}`);
      return [];
    }
  }

  async getSubtitles(content: ContentDetail): Promise<Subtitle[]> {
    const search = await this.searchContent(
      content.title,
      content.type,
      content.year,
      content.season,
      true,
      content.altTitle,
    );
    if (!search[0]) return [];
    const episodeId = await this._getEpisode(
      search[0]?.id,
      content.type,
      content.episode,
    );
    const subtitles = this._getSubtitles(episodeId);
    return subtitles;
  }

  async searchContent(
    title: string,
    type: ContentType,
    year?: number,
    season?: number,
    filter: boolean = true,
    altTitle?: string,
  ): Promise<SearchResult[]> {
    switch (type) {
      case "series":
      case "movie":
        const shows = await this._getShows(
          title,
          year,
          season,
          filter,
          altTitle,
        );
        return shows;
      default:
        return [];
    }
  }

  async generateStreamsAndSubtitles(
    searchResult: SearchResult,
    content: ContentDetail,
    config: UserConfig,
  ): Promise<Stream[]> {
    const { episode, id, season, year, type } = content;
    const episodeId = await this._getEpisode(searchResult.id, type, episode);
    const token = await this._getToken(episodeId, this.viGuid);
    const stream = await this._getStream(episodeId, token);
    if (!stream) return [];
    if (!stream.Video) return [];
    const url = this._fixUrl(stream.Video);
    const subtitleKey = `subtitles:kisskh:${type}:${id}:${season}:${episode}`;
    // Handle subtitles
    let subtitles = cache.get(subtitleKey);
    if (subtitles) cache.set(subtitleKey, subtitles);
    else {
      subtitles = await this._getSubtitles(episodeId);
      if (subtitles) cache.set(subtitleKey, subtitles);
    }
    const info = config.info ? await parseStreamInfo(url) : undefined;
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
        name: this.displayName,
        title: formatTitle,
        behaviorHints: {
          notWebReady: true,
          group: `yastream-kisskh`,
        },
      },
    ];
    return streams;
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
    year?: number,
    season?: number,
    isFilter: boolean = true,
    altTitle?: string,
  ): Promise<SearchResult[]> {
    const url = `${this.searchUrl}${title}&type=0`;
    this.logger.log(`GET search | ${url}`);
    const searchData = await axiosGet(url);
    if (!searchData) {
      return [];
    }
    const showList = searchData as SearchResult[];
    const show = isFilter
      ? matchTitle(showList, title, year, season, altTitle)
      : showList;
    this.logger.debug(`SeriesId/MovieId | ${JSON.stringify(show[0]?.id)}`);
    return show;
  }

  public async getContent(episodeId: string): Promise<Stream[]> {
    const streamKey = `streams:kisskh:${episodeId}`;
    const cacheContent = cache.get(streamKey);
    return cacheContent;
  }

  public async getDetail(kisskhId: string): Promise<KisskhDetail> {
    const url = `${this.detailUrl}${kisskhId}`;
    this.logger.log(`GET detail | ${url}`);
    const episodesData = await axiosGet<KisskhDetail>(url, {
      headers: this.headers,
    });
    if (episodesData) return episodesData;
    else throw new Error(`Not found detail from id | ${kisskhId}`);
  }

  private async _getEpisode(
    seriesId: string,
    type: ContentType,
    episode: number = 1,
  ) {
    switch (type) {
      case "series":
        if (!episode) {
          this.logger.error("Episode number required for series");
          throw new Error(`[KISSKH] Episode number required for series`);
        }
        break;
      default:
        break;
    }
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
    this.logger.debug(`EpisodeId | ${episodeId}`);
    return episodeId.toString();
  }

  private async _getStream(episodeId: string, token: string) {
    const url = this.episodeUrl.replace("{id}", episodeId) + token;
    this.logger.log(`GET stream | ${url}`);
    const stream = await axiosGet<StreamResponse>(url);
    if (!stream) return null;
    this.logger.log(`Stream Url | ${stream.Video}`);
    return stream;
  }

  private async _getSubtitles(episodeId: string): Promise<Subtitle[]> {
    const token = await this._getToken(episodeId, this.subGuid);
    const subtitleUrl = this.subUrl.replace("{id}", episodeId) + token;
    this.logger.log(`GET subtitles | ${subtitleUrl}`);
    const subtitleDatas = await axiosGet<SubResponse[]>(subtitleUrl);
    if (!subtitleDatas) return [];
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
