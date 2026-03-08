import {
  CatalogHandlerArgs,
  ContentType,
  MetaDetail,
  MetaPreview,
  MetaVideo,
  Stream,
  Subtitle,
} from "@stremio-addon/sdk";
import { Prefix, UserConfig } from "../lib/manifest.js";
import { axiosGet } from "../utils/axios.js";
import { ContentDetail } from "./meta.js";
import { BaseProvider } from "./provider.js";

interface OnetouchtvTop {
  result: {
    day: OnetouchtvPreview[];
    week: OnetouchtvPreview[];
    month: OnetouchtvPreview[];
  };
}
interface OnetouchtvHome {
  result: {
    recents: OnetouchtvPreview[];
    randomSlideShow: OnetouchtvPreview[];
  };
}
interface OnetouchtvSearch {
  result: OnetouchtvPreview[];
}

interface OnetouchtvPreview {
  id: string;
  title: string;
  year: string;
  description: string;
  country: string;
  genres: string[];
  image: string;
  otherTitles: string[];
}

interface OnetouchtvDetail {
  result: {
    id: string;
    episode: string;
    title: string;
    otherTitles: string[];
    year: string;
    description: string;
    genres: string[];
    image: string;
    episodes: OnetouchtvEpisodePreview[];
  };
}
interface OnetouchtvEpisodePreview {
  episode: string;
  identifier: string;
  playId: string;
  id: string;
  isSub: boolean;
}
interface OnetouchtvSource {
  type: string;
  contentId: string;
  id: string;
  name: string;
  quality: string;
  url: string;
}
interface OnetouchtvEpisode {
  result: {
    sources: OnetouchtvSource[];
    track: OnetouchtvSubtitle[];
  };
}
interface OnetouchtvSubtitle {
  file: string;
  label: string;
  name: string;
}

const ONETOUCHTV_CATALOG: Record<string, string> = {
  Popular: "popular",
  Chinese: "chinese",
  Korean: "korean",
  Thai: "thai",
};

const ONETOUCHTV_LANGUAGE: Record<string, CountryCode> = {
  English: CountryCode.en,
  Türk: CountryCode.tr,
  Española: CountryCode.es,
  中文: CountryCode.zh,
  繁体中文: CountryCode.zh,
  Arabic: CountryCode.ar,
  Hindi: CountryCode.hi,
  "Tiếng Việt": CountryCode.vi,
  Deutsch: CountryCode.de,
  Français: CountryCode.fr,
  Indonesia: CountryCode.id,
  Italian: CountryCode.it,
  اُردُو: CountryCode.multi,
  日本語: CountryCode.ja,
  한국어: CountryCode.ko,
  Português: CountryCode.pt,
  ខ្មែរ: CountryCode.km,
  ภาษาไทย: CountryCode.th,
  Русский: CountryCode.ru,
  မြန်မာ: CountryCode.ms,
  Burmese: CountryCode.ms,
  Myanmar: CountryCode.ms,
  Filipino: CountryCode.multi,
  বাংলা: CountryCode.bn,
  ਪੰਜਾਬੀ: CountryCode.pa,
};

export class OnetouchtvScrapper extends BaseProvider {
  supportedPrefix: Prefix[] = [
    Prefix.IMDB,
    Prefix.TMDB,
    Prefix.TVDB,
    Prefix.KISSKH,
    Prefix.ONETOUCHTV,
  ];
  baseUrl = Buffer.from("aHR0cHM6Ly9hcGkzLmRldmNvcnAubWU=", "base64").toString(
    "utf-8",
  );

  async searchCatalog(
    args: CatalogHandlerArgs,
    config: UserConfig,
  ): Promise<MetaPreview[]> {
    const { id, type, extra } = args;
    const search = extra.search!;
    const searchResults = await this.searchTitle(
      search,
      undefined,
      undefined,
      false,
    );
    const searches: MetaPreview[] = searchResults.result.map((item) => ({
      id: `${Prefix.ONETOUCHTV}:${item.id}`,
      name: item.title,
      poster: item.image,
      type: type,
    }));

    return searches;
  }

  async getCatalog(
    args: CatalogHandlerArgs,
    config: UserConfig,
  ): Promise<MetaPreview[]> {
    try {
      const { id, type, extra } = args;
      const skip = extra.skip;
      const [prefix, typeParam, name] = id.split(".");
      const pageSize = 10;
      let page = this.getPage(pageSize, skip);
      const catalogType = ONETOUCHTV_CATALOG[name || "Popular"];
      //   const url =
      //     type === "movie"
      //       ? `${this.baseUrl}/vod/movie?page=${page}`
      //       : `${this.baseUrl}/vod/popular?page=${page}`;
      let filteredData: OnetouchtvPreview[] = [];
      if (catalogType === ONETOUCHTV_CATALOG["Popular"]) {
        const topUrl = `${this.baseUrl}/vod/top`;
        this.logger.log(`GET catalog | ${topUrl}`);
        const encryptedData = await axiosGet<string>(topUrl);
        if (!encryptedData) return [];
        const data: OnetouchtvTop = decryptString(encryptedData);
        filteredData = data.result.day;
      } else {
        const url = `${this.baseUrl}/vod/home`;
        this.logger.log(`GET catalog | ${url}`);
        const encryptedData = await axiosGet<string>(url);
        if (!encryptedData) return [];
        const data: OnetouchtvHome = decryptString(encryptedData);
        filteredData = data.result.recents.filter(
          (item) => item.country === catalogType,
        );
      }
      return filteredData.map((item: any) => ({
        id: `${Prefix.ONETOUCHTV}:${item.id}`,
        name: item.title,
        poster: item.image,
        type: type,
      }));
    } catch (error) {
      this.logger.error(`Failed to get catalog ${args.id} | ${error}`);
      return [];
    }
  }

  async getMeta(
    content: ContentDetail,
    type: ContentType,
  ): Promise<MetaDetail | null> {
    try {
      const { id, season, episode } = content;
      const detail = (await this.getDetail(id)).result;
      console.log(`ONETOUCHTV episode detail | ${JSON.stringify(detail)}`);
      if (!detail) return null;
      const releaseDate =
        new Date(detail.year).toISOString() ||
        new Date(detail.year).toISOString() ||
        new Date().toISOString();
      console.log(
        `ONETOUCHTV episode detail | ${detail.title} S${season}E${episode} - ${releaseDate}`,
      );
      const videos: MetaVideo[] = detail.episodes.map((ep) => {
        const video = {
          id: `${Prefix.ONETOUCHTV}:${id}:${season}:${ep.episode}`,
          title: detail.title,
          released: releaseDate,
          season: 1,
          episode: parseInt(ep.episode),
          thumbnail: detail.image,
          background: detail.image,
        };
        return video;
      });
      return {
        id: id,
        type: type,
        name: detail.title,
        poster: detail.image,
        background: detail.image?.replace(
          "image-7wk.pages.dev",
          "image-v1.pages.dev",
        ),
        description: detail.description,
        released: releaseDate,
        genres: detail.genres,
        videos: videos,
      };
    } catch (error) {
      this.logger.error(`Failed to get meta for ${content.title} | ${error}`);
      return null;
    }
  }

  async getStreams(
    content: ContentDetail,
    config: UserConfig,
  ): Promise<Stream[]> {
    try {
      const { title, type, year, season, episode, id, altTitle } = content;
      const streamKey = `streams:${this.name}:${type}:${id}:${season}:${episode}`;
      const cacheStreams = cache.get(streamKey);
      if (cacheStreams) return cacheStreams;
      const search = await this.searchTitle(title, year, season);
      const searchResult = search.result[0];
      if (!searchResult) return [];
      const detail = await this.getDetail(searchResult.id);
      if (!detail) return [];
      const identifier = detail.result.episodes[0]?.identifier;
      const onetouchtvId = identifier || searchResult.id;
      const episodeDetail = await this.getEpisode(
        onetouchtvId,
        episode?.toString() || "1",
      );
      const streams = await Promise.all(
        episodeDetail.result.sources.map(async (source) => {
          const info = config.info
            ? await parseStreamInfo(source.url)
            : undefined;
          const formatTitle = this.formatStreamTitle(
            searchResult.title,
            year,
            season,
            episode,
            info,
          );
          const stream: Stream = {
            url: source.url,
            name: this.displayName,
            title: formatTitle,
            behaviorHints: {
              notWebReady: true,
              bingeGroup: `${this.displayName}-${this.name}`,
            },
          };
          return stream;
        }),
      );
      if (streams) cache.set(streamKey, streams, 4 * 60 * 60 * 1000);
      return streams;
    } catch (error) {
      this.logger.error(`Fail to get streams ${content.title} | ${error}`);
      return [];
    }
  }

  async getSubtitles(content: ContentDetail): Promise<Subtitle[]> {
    const { title, type, year, season, episode, id, altTitle } = content;
    const subKey = `subtitles:${this.name}:${type}:${id}:${season}:${episode}`;
    const cachedSubtitles = cache.get(subKey);
    if (cachedSubtitles) return cachedSubtitles;
    const episodeDetail = await this.getEpisode(
      content.id,
      content.episode?.toString() || "1",
    );
    const subtitles = episodeDetail.result.track.map((source) => {
      const subtitle: Subtitle = {
        id: source.file,
        url: source.file,
        lang:
          iso639FromCountryCode(
            ONETOUCHTV_LANGUAGE[source.name] || CountryCode.multi,
          ) || "Unknown",
      };
      return subtitle;
    });
    if (subtitles) cache.set(subKey, subtitles, 4 * 60 * 60 * 1000);
    return subtitles;
  }

  async searchTitle(
    title: string,
    year?: number,
    season?: number,
    isFilter = true,
  ): Promise<OnetouchtvSearch> {
    const url = `${this.baseUrl}/vod/search?page=1&keyword=${title}`;
    this.logger.log(`GET search | ${url}`);
    const encryptedData = await axiosGet<string>(url);
    if (!encryptedData) throw new Error("Failed to get search results");
    const data: OnetouchtvSearch = decryptString(encryptedData);
    const result = data.result;
    const details = isFilter ? matchTitle(result, title, year, season) : result;
    if (!details[0]) throw new Error("No matching search results");
    return { result: details };
  }

  async getDetail(id: string): Promise<OnetouchtvDetail> {
    const url = `${this.baseUrl}/vod/${id}/detail`;
    this.logger.log(`GET detail | ${url}`);
    const encryptedDetail = await axiosGet<string>(url);
    if (!encryptedDetail) throw new Error("Failed to get detail");
    const detailData: OnetouchtvDetail = decryptString(encryptedDetail);
    return detailData;
  }

  async getEpisode(id: string, episode: string): Promise<OnetouchtvEpisode> {
    const encryptedDetail = await axiosGet<string>(
      `${this.baseUrl}/vod/${id}/episode/${episode}`,
    );
    if (!encryptedDetail) throw new Error("Failed to get episode detail");
    const detailData: OnetouchtvEpisode = decryptString(encryptedDetail);
    return detailData;
  }
}

// Decryption
import crypto from "crypto";
import { cache } from "../utils/cache.js";
import { matchTitle } from "../utils/fuse.js";
import { CountryCode, iso639FromCountryCode } from "../utils/language.js";
import { parseStreamInfo } from "../utils/info.js";
const KEY_HEX = Buffer.from(
  "Njk2ZDM3MzI2MzY4NjE3MjUwNjE3MzczNzc2ZjcyNjQ2ZjY2NjQ0OTZlNjk3NDU2NjU2Mzc0NmY3MjUzNzQ2ZA==",
  "base64",
).toString();
const IV_HEX = Buffer.from(
  "Njk2ZDM3MzI2MzY4NjE3MjUwNjE3MzczNzc2ZjcyNjQ=",
  "base64",
).toString();
const KEY = Buffer.from(KEY_HEX, "hex");
const IV = Buffer.from(IV_HEX, "hex");

function normalizeCustomAlphabet(s: string): string {
  return s.replace(/-_\./g, "/").replace(/@/g, "+").replace(/\s+/g, "");
}

function base64ToBytes(b64: string): Uint8Array {
  let base64 = b64;
  const pad = base64.length % 4;
  if (pad !== 0) base64 += "=".repeat(4 - pad);
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    throw new Error("Invalid base64");
  }
}

function parseResult(text: string): any {
  try {
    const json = JSON.parse(text);
    const res = json;
    return typeof res === "string" ? JSON.parse(res) : res || json;
  } catch {
    return text;
  }
}

function decryptString<T>(input: string): T {
  try {
    const normalized = normalizeCustomAlphabet(input);
    const cipherBytes = base64ToBytes(normalized);
    if (cipherBytes.length % 16 !== 0) {
      throw new Error(
        `Ciphertext length (${cipherBytes.length}) not multiple of 16`,
      );
    }
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, IV);
    const decrypted = Buffer.concat([
      decipher.update(cipherBytes),
      decipher.final(),
    ]);
    return parseResult(decrypted.toString("utf8"));
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Decryption failed");
  }
}
