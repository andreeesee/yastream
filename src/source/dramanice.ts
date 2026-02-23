import CryptoJS from "crypto-js";
import { BaseProvider } from "./provider.js";
import {
  ContentType,
  Stream,
  MetaPreview,
  MetaDetail,
  Subtitle,
} from "stremio-addon-sdk";
import { Prefix } from "../lib/manifest.js";
import { ContentDetail } from "./meta.js";

export class DramaniceScraper extends BaseProvider {
  supportedPrefix: Prefix[] = [Prefix.IMDB, Prefix.TMDB, Prefix.TVDB];
  baseUrl = "https://dramanicee.lat";
  getStreams(
    title: string,
    type: ContentType,
    year?: number,
    season?: number,
    episode?: number,
    id?: string,
  ): Promise<Stream[] | null> {
    throw new Error("Method not implemented.");
  }
  searchCatalog(search: string, type: ContentType): Promise<MetaPreview[]> {
    throw new Error("Method not implemented.");
  }
  getCatalog(
    id: string,
    type: ContentType,
    skip?: number,
  ): Promise<MetaPreview[]> {
    throw new Error("Method not implemented.");
  }
  getMeta(id: string, type: ContentType): Promise<MetaDetail | null> {
    throw new Error("Method not implemented.");
  }
  getSubtitles(content: ContentDetail): Promise<Subtitle[]> {
    throw new Error("Method not implemented.");
  }
}
// Data extracted from your script
const encData =
  "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";
const keyHex =
  "845b40060ae138a1ce4fdb5b4c958d8d8f08a5c3db2e6f837655f39a92dde4df";
const ivHex = "5cccc22a5a07c1b209400ce33e323c96";

const key = CryptoJS.enc.Hex.parse(keyHex);
const iv = CryptoJS.enc.Hex.parse(ivHex);

const decrypted = CryptoJS.AES.decrypt(encData, key, {
  iv: iv,
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
});

const decryptedHtml = decrypted.toString(CryptoJS.enc.Utf8);

// The m3u8 link will be inside the source or file parameter in the decrypted HTML
console.log(decryptedHtml);
