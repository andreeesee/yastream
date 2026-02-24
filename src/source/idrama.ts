import axios from "axios";
import * as cheerio from "cheerio";
import {
  ContentType,
  MetaDetail,
  MetaPreview,
  MetaVideo,
  Stream,
  Subtitle,
} from "stremio-addon-sdk";
import { cache } from "../utils/cache.js";
import { BaseProvider } from "./provider.js";
import { Prefix } from "../lib/manifest.js";
import { ContentDetail } from "./meta.js";
import { parseStreamInfo } from "../utils/info.js";

interface IDramaItem {
  id: string;
  title: string;
  url: string;
  poster: string;
  type: ContentType;
}
interface IDramaDetail {
  urls: string[];
  title: string;
  description: string;
  thumbnail: string;
  year: number;
}

interface IDramaBloggerResult {
  entry: {
    content: {
      $t: string;
    };
    title: {
      $t: string;
    };
    published: {
      $t: string;
    };
    media$thumbnail: {
      url: string;
    };
  };
}

export class IDramaScraper extends BaseProvider {
  baseUrl = "https://www.idramahd.com";
  supportedPrefix: Prefix[] = [Prefix.IDRAMA];
  pageSize = 30;
  public readonly BLOG_IDS = {
    TVSABAY: "8016412028548971199",
    ONELEGEND: "596013908374331296",
  };

  async searchCatalog(
    id: string,
    type: ContentType,
    search: string,
  ): Promise<MetaPreview[]> {
    this.logger.log(`Search | ${search}`);
    const url = `${this.baseUrl}/?s=${search}`;
    const searchKey = `search:${url}`;
    const cacheCatalog: MetaPreview[] = cache.get(searchKey);
    if (cacheCatalog) return cacheCatalog;
    const items = await this.getItems(url);
    const catalog: MetaPreview[] = items.map((item) => ({
      id: `${item.id}`,
      type: type,
      name: item.title,
      poster: item.poster,
      posterShape: "regular",
    }));
    cache.set(searchKey, catalog);
    return catalog;
  }

  async getCatalog(
    id: string,
    type: ContentType,
    skip?: number,
  ): Promise<MetaPreview[]> {
    const page = skip ? Math.ceil(skip / this.pageSize) + 1 : 1;
    const url = `${this.baseUrl}/page/${page}/`;
    const catalogKey = `catalog:${url}`;
    const cacheCatalog: MetaPreview[] = cache.get(catalogKey);
    if (cacheCatalog) return cacheCatalog;
    const items = await this.getItems(url);
    const catalog: MetaPreview[] = items.map((item) => ({
      id: `${item.id}`,
      type: type,
      name: item.title,
      poster: item.poster,
      posterShape: "regular",
    }));
    cache.set(catalogKey, catalog, 4 * 60 * 60 * 1000);
    return catalog;
  }

  async _scrapeDetail(url: string) {
    this.logger.debug(`Scrape ${url}`);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const rawTitle =
      $("h1.entry-title").text().trim() || $("title").text().trim();
    const title = rawTitle.replace(/-\[.*/g, "");
    const description = $("#player").next("p").text().trim();
    const thumbnail = $('meta[property="og:image"]').attr("content") || "";
    const postId = $("div#player").attr("data-post-id") || "";
    return {
      title: title,
      description: description,
      thumbnail: thumbnail,
      postId: postId,
    };
  }

  async getMeta(id: string, type: ContentType): Promise<MetaDetail> {
    const metaKey = `meta:${id}`;
    const cacheMeta: MetaDetail = cache.get(metaKey);
    if (cacheMeta) return cacheMeta;
    const videos = await this._getEpisodes(id);
    const title = videos[0]?.title;
    const released = videos[0]?.released;
    const formatTitle = title?.toLowerCase().trim().replace(/ /g, "-");
    const url = `${this.baseUrl}/${formatTitle}`;
    const detail = await this._scrapeDetail(url);
    videos.forEach((video) => (video.thumbnail = detail.thumbnail));
    const meta: MetaDetail = {
      id: `idrama:${id}`,
      name: title || detail.title,
      type: "series",
      description: title, // no description
      poster: detail.thumbnail,
      background: detail.thumbnail,
      videos: videos,
      released: released,
    };
    cache.set(metaKey, meta);
    return meta;
  }

  async getStreams(
    title: string,
    type: ContentType,
    year?: number,
    season?: number,
    episode?: number,
    id?: string,
    altTitle?: string,
  ): Promise<Stream[] | null> {
    try {
      if (!id) {
        return [];
      }
      this.logger.log(`Stream | ${title} ${id}`);
      const postId = id;
      const streamKey = `streams:${title}:${type}:${season}:${episode}`;
      const cacheStreams: Stream[] = cache.get(streamKey);
      if (cacheStreams) {
        return cacheStreams;
      }

      const { urls } = await this.getStreamDetail(postId);
      this.logger.debug(`Title ${title}`);
      const url = episode ? urls[episode - 1] : urls[0];
      let info;
      try {
        info = await parseStreamInfo(url!);
      } catch (error) {
        this.logger.error(`Fail to parse stream info | ${error}`);
      }
      const formatTitle = this.formatStreamTitle(
        title,
        year,
        season,
        episode,
        info,
      );
      this.logger.log(`Stream Url | ${url}`);
      const streams: Stream[] = [
        {
          url: url,
          name: "yastream",
          title: `${formatTitle}`,
          behaviorHints: {
            notWebReady: true,
            group: `yastream-kisskh`,
          },
        },
      ];
      cache.set(streamKey, streams);
      return streams;
    } catch (error) {
      this.logger.error(`getStreams failed: ${error}`);
      return [];
    }
  }

  async getSubtitles(content: ContentDetail): Promise<Subtitle[]> {
    return [];
  }

  async _getEpisodes(postId: string): Promise<MetaVideo[]> {
    try {
      const { urls, title, thumbnail } = await this.getStreamDetail(postId);
      const videos: MetaVideo[] = urls.map((url, index) => {
        const season = 1;
        return {
          id: `idrama:${postId}:${season}:${index + 1}`,
          title: `${title}`,
          overview: title,
          released: new Date(this._extractReleasedDate(url)).toISOString(),
          episode: index + 1,
          season: season,
          thumbnail: thumbnail,
        };
      });
      return videos;
    } catch (error) {
      this.logger.error(`Episodes not found ${error}`);
      return [];
    }
  }

  async getStreamDetail(postId: string): Promise<IDramaDetail> {
    const detailKey = `detail:idrama:${postId}`;
    const cacheDetail = cache.get(detailKey);
    if (cacheDetail) return cacheDetail;
    const isOneLegend =
      this.baseUrl.toLowerCase().includes("onelegend") ||
      this.baseUrl.toLowerCase().includes("idramahd");
    const blogId = isOneLegend
      ? this.BLOG_IDS.ONELEGEND
      : this.BLOG_IDS.TVSABAY;
    const feedUrl = `https://www.blogger.com/feeds/${blogId}/posts/default/${postId}?alt=json`;
    const response = await axios.get(feedUrl);
    const data = response.data as IDramaBloggerResult;
    // title: Morodok Sne មរតកស្នេហ៍ 122 -> Morodok Sne
    const title =
      data.entry.title.$t.match(/^[A-Za-z0-9 ]*/)?.[0].trim() ||
      data.entry.title.$t.replace(/^[A-z0-9 ]/g, "").trim();
    const urls = this._extractVideoLinks(data.entry.content.$t);
    const thumbnail = data.entry.media$thumbnail.url;
    const year =
      parseInt(data.entry.published.$t.slice(0, 4)) || new Date().getFullYear();
    const detail = {
      urls: urls,
      title: title,
      description: title,
      thumbnail: thumbnail,
      year: year,
    };
    cache.set(detailKey, detail, 1 * 60 * 60 * 1000);
    return detail;
  }

  _extractReleasedDate = (url: string): string => {
    const match = url.match(/\/(\d{4})\/(\d{2})(\d{2})\//);
    return match
      ? `${match[1]}-${match[2]}-${match[3]}`
      : new Date().toString();
  };

  _extractVideoLinks = (text: string): string[] => {
    // This regex looks for http/https links ending in m3u8 or mp4
    // including query parameters like ?rp=o00
    const regex = /https?:\/\/[^\s"';<> ]+\.(?:m3u8|mp4)(?:\?[^\s"';<> ]+)?/gi;
    const matches = text.match(regex);
    this.logger.log(`Extracted Urls | ${JSON.stringify(matches?.length)}`);
    return matches ? Array.from(new Set(matches)) : [];
  };

  /**
   * Scrapes the list grid (article.hitmag-post)
   */
  async getItems(url: string): Promise<IDramaItem[]> {
    const { data } = await axios.get(url, { headers: this.headers });
    const $ = cheerio.load(data);

    const articles = $("article.hitmag-post").toArray();

    // Use map with Promise.all to handle the async calls
    const results: IDramaItem[] = await Promise.all(
      articles.map(async (el) => {
        const $el = $(el);
        const a = $el.find("h3.entry-title a");
        const img = $el.find(".archive-thumb img");

        const rawTitle = a.text().trim();
        const title = rawTitle.replace(/-\[.*/g, "");
        const link = a.attr("href") || "";

        let poster = img.attr("data-src") || img.attr("src") || "";
        if (!poster && img.attr("srcset")) {
          poster = img.attr("srcset")!.split(",")[0]?.split(" ")[0] || "";
        }

        try {
          const { postId } = await this._scrapeDetail(link);

          if (title && link) {
            return {
              id: `idrama:${postId}`,
              title: title,
              url: link,
              poster: poster,
              type: link.includes("/tvshows/") ? "series" : "movie",
            };
          }
        } catch (err) {
          this.logger.error(`Failed to get meta for ${title}`);
        }
        return {
          id: url,
          title: title,
          url: link,
          poster: poster,
          type: link.includes("/tvshows/") ? "series" : "movie",
        };
      }),
    );

    return results;
  }
}
