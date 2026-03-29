import {
  CatalogHandlerArgs,
  ContentType,
  MetaDetail,
  MetaPreview,
  MetaVideo,
  Stream,
  Subtitle,
} from "@stremio-addon/sdk";
import * as cheerio from "cheerio";
import { Prefix, UserConfig } from "../lib/manifest.js";
import { axiosGet } from "../utils/axios.js";
import { cache } from "../utils/cache.js";
import { ENV } from "../utils/env.js";
import { matchTitle } from "../utils/fuse.js";
import { parseStreamInfo } from "../utils/info.js";
import { CountryCode, iso639FromCountryCode } from "../utils/language.js";
import { getSetDecryptedSubtitle } from "../utils/subtitle.js";
import { ContentDetail } from "./meta.js";
import { BaseProvider } from "./provider.js";
import { getRpdbPoster } from "./rpdb.js";
import { tmdb } from "./tmdb.js";

export interface SearchResult {
  id: number;
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
  readonly urls = [
    "https://kisskh.co",
    "https://kisskh.do",
    // "https://kisskh.id",
    "https://kisskh.ovh",
  ];
  readonly baseUrl: string = "https://kisskh.co";
  getBaseUrl() {
    const randomIndex = Math.floor(Math.random() * this.urls.length);
    return this.urls[randomIndex];
  }
  readonly supportedPrefix: Prefix[] = [
    Prefix.IMDB,
    Prefix.TMDB,
    Prefix.TVDB,
    Prefix.KISSKH,
    Prefix.ONETOUCHTV,
  ];
  private readonly pageSize = 20;
  private readonly subGuid: string = "VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp";
  private readonly viGuid: string = "62f176f3bb1b5b8e70e39932ad34a0c7";
  private getSearchUrl() {
    return this.getBaseUrl() + "/api/DramaList/Search?q=";
  }
  private getExploreUrl() {
    return this.getBaseUrl() + "/api/DramaList/List";
  }
  private getDetailUrl() {
    return this.getBaseUrl() + "/api/DramaList/Drama/";
  }
  private getEpisodeUrl() {
    return this.getBaseUrl() + "/api/DramaList/Episode/{id}.png?kkey=";
  }
  private getSubUrl() {
    return this.getBaseUrl() + "/api/Sub/{id}?kkey=";
  }
  private readonly TYPE: Record<ContentType, string> = {
    series: "1",
    movie: "2",
    channel: "1",
    tv: "1",
  };
  private tokenJsCode: string | null = null;
  private nsfwIds = new Set([
    12660, 12639, 12563, 12519, 12518, 12517, 12516, 12515, 12514, 12513, 12510,
    12504, 12503, 12495, 12491, 12480, 12413, 12378, 12332, 12331, 12330, 12314,
    12285, 12284, 12200, 12179, 12177, 12130, 12129, 12127, 12125, 12124, 12123,
    12106, 11915, 11834, 11782, 11544, 11519, 11518, 11517, 11511, 11509, 11436,
    10942, 10761,
  ]);
  private kisskhTmdb = new Map([[12422, "307602"]]);

  async searchCatalog(
    args: CatalogHandlerArgs,
    config: UserConfig,
  ): Promise<MetaPreview[]> {
    const { id, type, extra } = args;
    const search = extra.search;
    this.logger.log(`Search | ${search}`);
    if (!search) {
      this.logger.error("Search term is required for search");
      return [];
    }
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
    const tmdbDetails = await Promise.all(
      filterResults.map((item) => tmdb.searchDetailImdb(item.title, type)),
    );
    const metas = await Promise.all(
      filterResults.map(async (kissItem, index) => {
        const tmdbDetail = tmdbDetails[index];
        let poster = kissItem.thumbnail;

        // Use TMDB/RPDB if available
        if (tmdbDetail) {
          const sameTitleId = this.kisskhTmdb.get(kissItem.id);
          if (sameTitleId) {
            tmdbDetail.id = sameTitleId;
          }
          poster = await getRpdbPoster(
            Prefix.TMDB,
            tmdbDetail.id,
            type,
            tmdbDetail.thumbnail || kissItem.thumbnail,
          );
        }

        // Filter nsfw
        if (!config.nsfw && this.nsfwIds.has(kissItem.id)) {
          poster = this.nsfwDefaultThumbnail;
        }

        const meta: MetaPreview = {
          id: `${Prefix.KISSKH}:${kissItem.id}`,
          name: kissItem.title,
          type: type,
          background: kissItem.thumbnail,
          poster: poster,
        };
        return meta;
      }),
    );
    return metas;
  }

  /**
   * Search Last update of ongoing and complete
   * @param id
   * @param type
   * @param skip
   * @returns
   */
  async getCatalog(
    args: CatalogHandlerArgs,
    config: UserConfig,
  ): Promise<MetaPreview[]> {
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
    const country = KISSKH_COUNTRY[countryName!];
    let urls = [];
    let urlNum = 1;
    let page = this.getPage(this.pageSize, skip, urlNum);
    if (type === "series" || t === holliwood) {
      urlNum = 2;
      page = this.getPage(this.pageSize, skip, urlNum);
      urls.push(
        this.getExploreUrl() +
          `?page=${page}&type=${t}&sub=0&country=${country}&status=${ongoing}&order=2`,
      );
    }
    urls.push(
      this.getExploreUrl() +
        `?page=${page}&type=${t}&sub=0&country=${country}&status=${completed}&order=2`,
    );

    // 1. Fetch all catalogs concurrently
    const catalogDatas = await Promise.all(
      urls.map((url) => {
        this.logger.log(`GET catalog | ${url}`);
        return axiosGet<KisskhCatalogData>(url);
      }),
    );

    // 2. Filter null and flat to one list from multiple urls
    const flatDatas = catalogDatas
      .filter((res): res is KisskhCatalogData => !!res?.data)
      .flatMap((res) => res.data);

    // 3. Search TMDB using the flattened list
    const tmdbDetails = await Promise.all(
      flatDatas.map((item) => tmdb.searchDetailImdb(item.title, type)),
    );

    // 4. Map to final Meta format
    const metas = await Promise.all(
      flatDatas.map(async (kissItem, index) => {
        const tmdbDetail = tmdbDetails[index];
        let poster = kissItem.thumbnail;

        // Use TMDB/RPDB if available
        if (tmdbDetail) {
          const sameTitleId = this.kisskhTmdb.get(kissItem.id);
          if (sameTitleId) {
            tmdbDetail.id = sameTitleId;
          }
          poster = await getRpdbPoster(
            Prefix.TMDB,
            tmdbDetail.id,
            type,
            tmdbDetail.thumbnail || kissItem.thumbnail,
          );
        }

        // NSFW Override
        if (!config.nsfw && this.nsfwIds.has(kissItem.id)) {
          poster = this.nsfwDefaultThumbnail;
        }

        let id = `${Prefix.KISSKH}:${kissItem.id}`;
        // if (tmdbDetail?.imdbId) {
        //   id = `${tmdbDetail.imdbId}`;
        // }
        const metaDetail: MetaDetail = {
          id: id,
          name: kissItem.title,
          type: type,
          background: kissItem.thumbnail,
          poster,
        };

        if (type === "movie") {
          metaDetail.behaviorHints = {
            defaultVideoId: `${id}:1:1`,
          };
          return metaDetail;
        }
        return metaDetail;
      }),
    );
    return metas;
  }

  async getMeta(
    content: ContentDetail,
    type: ContentType,
  ): Promise<MetaDetail | null> {
    const detail = await this.getDetail(content.id);
    const year = new Date(detail.releaseDate).getFullYear();
    const tmdbDetail = await tmdb.searchDetailImdb(detail.title, type, year);
    if (tmdbDetail) {
      detail.description = tmdbDetail.overview || detail.description;
    }
    const season = 1;
    const date = new Date(detail.releaseDate).toISOString();
    const videos: MetaVideo[] = detail.episodes.map((ep, index) => {
      const episodeNum = ep.number;
      let id = `kisskh:${detail.id}:${season}:${episodeNum}`;
      // In Kisskh sometimes movie also has multiple episodes
      return {
        id: id,
        released: date,
        title: detail.title,
        type: type,
        description: detail.description,
        thumbnail: detail.thumbnail,
        background: detail.thumbnail,
        season: season,
        episode: episodeNum,
      };
    }).sort((a, b) => a.episode - b.episode);
    let metaId = `${Prefix.KISSKH}:${detail.id}`;
    const meta: MetaDetail = {
      id: metaId,
      name: detail.title,
      logo: tmdbDetail?.logo || "",
      poster: detail.thumbnail,
      background: detail.thumbnail,
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
    const { title, type, year, season, episode, id, kisskhId, altTitle } =
      content;
    try {
      const streamKey = `streams:${type}:${this.name}:${id}:${season}:${episode}`;
      const cacheStreams = cache.get(streamKey);
      if (cacheStreams) return cacheStreams;
      if (!kisskhId) {
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
        const search = searchResult[0];
        const searchId = search.id;
        const searchTitle = search.title;
        const streams = await this.generateStreamsAndSubtitles(
          searchId,
          searchTitle,
          content,
          config,
        );
        if (streams) cache.set(streamKey, streams, 4 * 60 * 60 * 1000);
        return streams;
      } else {
        const streams = await this.generateStreamsAndSubtitles(
          parseInt(kisskhId),
          title,
          content,
          config,
        );
        if (streams.length > 0)
          cache.set(streamKey, streams, 4 * 60 * 60 * 1000);
        return streams;
      }
    } catch (error: any) {
      this.logger.error(`${error.message}`);
      return [];
    }
  }

  async getSubtitles(content: ContentDetail): Promise<Subtitle[]> {
    const subtitleKey = `subtitles:${content.type}:${this.name}:${content.id}:${content.season}:${content.episode}`;
    let cacheSubtitles = cache.get(subtitleKey);
    if (cacheSubtitles) return cacheSubtitles;
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
    kisskhId: number,
    title: string,
    content: ContentDetail,
    config: UserConfig,
  ): Promise<Stream[]> {
    const { episode, id, season, year, type } = content;
    const episodeId = await this._getEpisode(kisskhId, type, episode);
    const token = await this._getToken(episodeId, this.viGuid);
    const stream = await this._getStream(episodeId, token);
    if (!stream) return [];
    if (!stream.Video) return [];
    const url = this._fixUrl(stream.Video);
    const subtitleKey = `subtitles:${type}:${this.name}:${id}:${season}:${episode}`;
    // Handle subtitles
    let subtitles = cache.get(subtitleKey);
    if (subtitles) cache.set(subtitleKey, subtitles);
    else {
      subtitles = await this._getSubtitles(episodeId);
      if (subtitles) cache.set(subtitleKey, subtitles);
    }
    const info = config.info ? await parseStreamInfo(url) : undefined;
    const formatTitle = this.formatStreamTitle(
      title,
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
          bingeGroup: "yastream-kisskh",
        },
      },
    ];
    return streams;
  }

  private async _getToken(episodeId: string, uid: string): Promise<string> {
    if (!this.tokenJsCode) {
      const html = await axiosGet<string>(this.getBaseUrl() + "/index.html");
      if (!html)
        throw new Error(`Failed to fetch index.html for token generation`);
      const $ = cheerio.load(html);
      const scriptSrc = $('script[src*="common"]').attr("src");
      const jsCode = await axiosGet<string>(
        this.getBaseUrl() + "/" + scriptSrc,
      );
      this.tokenJsCode = jsCode;
    }

    const sandbox = `
            ${this.tokenJsCode};
            _0x54b991(${episodeId}, null, "2.8.10", "${uid}", 4830201, "kisskh", "kisskh", "kisskh", "kisskh", "kisskh", "kisskh");
        `;

    try {
      const token = eval(sandbox);
      if (!token) {
        throw new Error(`Token generation failed`);
      }
      return token;
    } catch (e) {
      throw new Error(`Token generation failed | ${e}`);
    }
  }

  private async _getShows(
    title: string,
    year?: number,
    season?: number,
    isFilter: boolean = true,
    altTitle?: string,
  ): Promise<SearchResult[]> {
    const url = `${this.getSearchUrl()}${title}&type=0`;
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
    const url = `${this.getDetailUrl()}${kisskhId}`;
    this.logger.log(`GET detail | ${url}`);
    const episodesData = await axiosGet<KisskhDetail>(url, {
      headers: this.headers,
    });
    if (episodesData) return episodesData;
    else throw new Error(`Not found detail from id | ${kisskhId}`);
  }

  private async _getEpisode(
    seriesId: number,
    type: ContentType,
    episode: number = 1,
  ) {
    switch (type) {
      case "series":
        if (!episode) {
          this.logger.error("Episode number required for series");
          throw new Error(`Episode number required for series`);
        }
        break;
      default:
        break;
    }
    const detail = await this.getDetail(seriesId.toString());
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
    const url = this.getEpisodeUrl().replace("{id}", episodeId) + token;
    this.logger.log(`GET stream | ${url}`);
    const stream = await axiosGet<StreamResponse>(url, {timeout: 15000});
    if (!stream) return null;
    this.logger.log(`Stream Url | ${stream.Video}`);
    return stream;
  }

  private async _getSubtitles(episodeId: string): Promise<Subtitle[]> {
    const token = await this._getToken(episodeId, this.subGuid);
    const subtitleUrl = this.getSubUrl().replace("{id}", episodeId) + token;
    this.logger.log(`GET subtitles | ${subtitleUrl}`);
    const subtitleDatas = await axiosGet<SubResponse[]>(subtitleUrl);
    if (!subtitleDatas) return [];
    const subtitles: Subtitle[] = [];
    for (const [index, subtitleData] of subtitleDatas.entries()) {
      const lang = iso639FromCountryCode(subtitleData.land as CountryCode);
      const src = subtitleData.src;
      const subtitle: Subtitle = {
        id: `${this.name}-${index.toString()}`,
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
    const domain = ENV.DOMAIN;
    const port = ENV.PORT;
    const protocol = domain === "localhost" ? "http" : "https";
    const url =
      domain === "localhost"
        ? `${protocol}://${domain}:${port}`
        : `${protocol}://${domain}`;
    return `${url}/subtitle/${originalUrl}`;
  }

  private _fixUrl(url: string): string {
    if (!url.startsWith("http")) {
      return `https:${url}`;
    }
    return url;
  }
}

export default KissKHScraperr;
