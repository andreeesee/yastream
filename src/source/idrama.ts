import axios from "axios";
import * as cheerio from "cheerio";
import { BaseProvider } from "./provider.js";
import { ContentType, Stream } from "stremio-addon-sdk";

// Configuration
interface DramaItem {
  title: string;
  url: string;
  poster: string;
  type: "movie" | "series";
}

export class IDramaScraper extends BaseProvider {
  name = "IDRAMA";
  baseUrl = "https://www.idramahd.com/";

  async getStreams(
    title: string,
    type: ContentType,
    year: number | null,
    season: number | null,
    episode: number | null,
  ): Promise<Stream[] | null> {
    // const searchResult = await this.search(title);
    const items = this.getItems(this.baseUrl);
    this.logger.log(`Search result ${JSON.stringify(items)}`);
    return [];

    // this.getStreamLinks();
  }

  async getItems(url: string) {
    const { data } = await axios.get(url, {
      headers: this.headers,
    });
    const $ = cheerio.load(data);
    const results: any[] = [];

    $("article.hitmag-post").each((_, el) => {
      const a = $(el).find("h3.entry-title a");
      const img = $(el).find(".archive-thumb img");

      const title = a.text().trim();
      const url = a.attr("href");
      let poster = img.attr("data-src") || img.attr("src") || "";

      // Handle srcset if src is missing
      if (!poster && img.attr("srcset")) {
        poster = img.attr("srcset")!.split(",")[0]?.split(" ")[0] || "";
      }

      if (title && url) {
        results.push({ title, url: url, poster });
      }
    });

    return results;
  }

  /**
   * Replicates the Blogger Feed logic for Tvsabay and OneLegend
   */
  async _getStreams(startUrl: string): Promise<Stream[]> {
    try {
      // 1. Fetch the intermediate page to get the post-id
      const { data: html } = await axios.get(startUrl, {
        headers: this.headers,
      });

      const postIdMatch = html.match(/data-post-id=["']?(\d+)/);
      if (!postIdMatch) throw new Error("No post-id found");
      const postId = postIdMatch[1];

      // 2. Determine which Blog ID to use based on the URL or content
      // Based on your python: Tvsabay = 8016412028548971199, OneLegend = 596013908374331296
      const isOneLegend = startUrl.toLowerCase().includes("onelegend");
      const blogId = isOneLegend ? "596013908374331296" : "8016412028548971199";

      // 3. Fetch the Blogger JSON feed
      const feedUrl = `https://www.blogger.com/feeds/${blogId}/posts/default/${postId}?alt=json`;
      const { data: feedJson } = await axios.get(feedUrl);

      const content = feedJson.entry.content.$t;
      const streams: Stream[] = [];

      // 4. Regex extract m3u8 or mp4 links
      const videoRegex = /https?:\/\/[^\s"'<> ]+\.(?:m3u8|mp4)/gi;
      const matches = content.match(videoRegex) || [];

      matches.forEach((url: string, index: number) => {
        streams.push({
          name: `Episode ${index + 1}`,
          url: url,
        });
      });

      return streams;
    } catch (error) {
      console.error("[iDrama] Stream extraction failed:", error);
      return [];
    }
  }

  /**
   * Replicates SINDEX_IDRAMA (Search)
   */
  async search(query: string): Promise<DramaItem[]> {
    const searchUrl = `${this.baseUrl}?s=${encodeURIComponent(query)}`;
    return this.parseGridPage(searchUrl);
  }

  /**
   * Replicates INDEX_IDRAMA (Category/Home listing)
   */
  async getCatalog(url: string = this.baseUrl): Promise<DramaItem[]> {
    return this.parseGridPage(url);
  }

  /**
   * Generic parser for WordPress-style movie grids
   */
  private async parseGridPage(url: string): Promise<DramaItem[]> {
    try {
      const { data } = await axios.get(url, {
        headers: this.headers,
      });

      const $ = cheerio.load(data);
      const results: DramaItem[] = [];
      const notFound = $(".page-content").children().text().includes("Sorry");
      if (notFound) {
        return [];
      }
      this.logger.log(`Html | ${$("body")}`);
      this.logger.log(
        `Page | ${$(".page-content").children().text().includes("Sorry")}`,
      );

      // Selector based on common WP Drama themes (Avenue/iDrama)
      // Adjust selectors if the site structure differs
      $(".result-item, .item, .post-item").each((_, el) => {
        const titleElement = $(el).find(".title a, h3 a, .entry-title a");
        const imgElement = $(el).find("img");

        const title = titleElement.text().trim();
        const link = titleElement.attr("href") || "";
        const poster =
          imgElement.attr("src") || imgElement.attr("data-src") || "";

        if (title && link) {
          results.push({
            title,
            url: link,
            poster,
            type: link.includes("/tvshows/") ? "series" : "movie",
          });
        }
      });

      return results;
    } catch (error) {
      console.error(`[iDrama] Failed to parse ${url}:`, error);
      return [];
    }
  }

  /**
   * Replicates EPISODE_TVSABAY / ONELEGEND logic
   * Scrapes the detail page for video source links
   */
  async getStreamLinks(pageUrl: string): Promise<string[]> {
    try {
      const { data } = await axios.get(pageUrl, {
        headers: this.headers,
      });
      const $ = cheerio.load(data);
      const sources: string[] = [];

      // Look for iframe sources or Blogger links commonly used in Khmer dramas
      $("iframe, source").each((_, el) => {
        const src = $(el).attr("src");
        if (
          src &&
          (src.includes("blogger.com") ||
            src.includes("ok.ru") ||
            src.includes("drive.google"))
        ) {
          sources.push(src);
        }
      });

      // Fallback: Check for links inside scripts (common for iDrama)
      const scripts = $("script")
        .map((_, el) => $(el).html())
        .get()
        .join(" ");
      const bloggerRegex =
        /https:\/\/www\.blogger\.com\/video-play\.mp4\?contentId=[a-z0-9]+/gi;
      const foundLinks = scripts.match(bloggerRegex);

      if (foundLinks) sources.push(...foundLinks);

      return [...new Set(sources)]; // Remove duplicates
    } catch (error) {
      return [];
    }
  }
}
