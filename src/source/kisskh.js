const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");

const Fuse = require("fuse.js");

class KissKHKISSKHr {
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
    // this.subtitles_url = this.baseUrl + "api/Sub/{id}?kkey=";

    // Decryption Keys (Buffers for Crypto)
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
    this.token_js_code = null;
  }

  // Helper for AES Decryption (Node.js version of _aes_decrypt)
  _decrypt(data, key, iv) {
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
    let decrypted = decipher.update(data, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  async _getToken(episodeId, uid) {
    if (!this.token_js_code) {
      const { data: html } = await axios.get(this.baseUrl + "index.html");
      const $ = cheerio.load(html);
      const scriptSrc = $('script[src*="common"]').attr("src");
      const { data: jsCode } = await axios.get(this.baseUrl + scriptSrc);
      this.token_js_code = jsCode;
    }

    // We wrap the obfuscated function call.
    // WARNING: eval() is used here to match the Python quickjs behavior.
    const sandbox = `
            ${this.token_js_code};
            _0x54b991(${episodeId}, null, "2.8.10", "${uid}", 4830201, "kisskh", "kisskh", "kisskh", "kisskh", "kisskh", "kisskh");
        `;

    try {
      // In a production environment, use 'vm' module for safer execution
      return eval(sandbox);
    } catch (e) {
      console.error("[KISSKH] Token generation failed", e);
      return null;
    }
  }

  async searchContent(title, type = "movie", episode) {
    try {
      let results = [];

      try {
        // Series
        const seriesResponse = await axios.get(
          `${this.searchUrl}${title}&type=0`,
          { headers: this.headers },
        );
        const seriesList = seriesResponse.data.slice(0, 15);
        const series = this.bestMatch(seriesList, title);
        console.log(`[KISSKH] Match ${series.title}`);
        const seriesId = series.id;
        console.log(`[KISSKH] SeriesId ${JSON.stringify(seriesId)}`);
        // Episodes
        const episodeResponse = await axios.get(
          `${this.seriesUrl}${seriesId}`,
          { headers: this.headers },
        );
        const episodeDatas = episodeResponse.data?.episodes;
        const episodeCount = episodeResponse.data?.episodesCount;
        const episodeData = episodeDatas[episodeCount - episode];
        const episodeId = episodeData.id;
        console.log(`[KISSKH] EpisodeId ${JSON.stringify(episodeId)}`);
        // Stream
        const token = await this._getToken(episodeId, this.viGuid);
        const streamUrl = this.episodeUrl.replace("{id}", episodeId) + token;
        const streamResponse = await axios.get(`${streamUrl}`);
        const stream = streamResponse.data;
        console.log(`[KISSKH] Stream ${JSON.stringify(stream)}`);
        const resource = {
          title: series.title,
          url: this.fixUrl(stream.Video),
          type: type,
        };
        return [resource];
      } catch (err) {
        console.log(`[KISSKH] Error ${err}`);
      }
      return [];

      // If no search results, try browsing popular content
      // if (results.length === 0) {
      //   results = await this.browsePopularContent(title, type);
      // }
    } catch (error) {
      console.error("Search error:", error.message);
      return null;
    }
  }

  fixUrl(url) {
    if (!url.startsWith("http")) {
      return `https:${url}`;
    }
    return url;
  }

  async browsePopularContent(title, type) {
    try {
      const response = await axios.get(this.baseUrl, { headers: this.headers });
      const $ = cheerio.load(response.data);

      const results = [];

      // Look for content in the main page sections - these point to contentDomain
      $('a[href*="/drama/"], a[href*="/movie/"], a[href*="/anime/"]').each(
        (i, element) => {
          const $el = $(element);
          const resultTitle = $el.text().trim();
          const link = $el.attr("href");

          if (link && resultTitle.toLowerCase().includes(title.toLowerCase())) {
            results.push({
              title: resultTitle,
              link: link.startsWith("http")
                ? link
                : `${this.contentDomain}${link}`,
              type: type,
            });
          }
        },
      );

      return results;
    } catch (error) {
      return [];
    }
  }

  async getSubtitles(episodeId) {
    try {
      // 1. Generate the subtitle-specific token
      const token = await this._getToken(episodeId, this.subGuid);

      // 2. Request the subtitle list
      const url = this.subtitles_url.replace("{id}", episodeId) + token;
      const { data: subData } = await axios.get(url);

      if (!subData || !Array.isArray(subData)) return {};

      // 3. Format into a readable object { 'English': 'url...', 'Spanish': 'url...' }
      return subData.reduce((acc, sub) => {
        acc[sub.label] = sub.src;
        return acc;
      }, {});
    } catch (e) {
      console.error("Failed to fetch subtitles:", e.message);
      return {};
    }
  }

  async getStreams(title, type, year = null, season = null, episode = null) {
    try {
      const searchResults = await this.searchContent(title, type, episode);
      if (searchResults.length === 0) {
        console.log("[KISSKH] No results");
        return null;
      }
      return [
        {
          url: searchResults[0].url,
          type,
          season,
          episode,
          name: "AsiaView",
          description: "kisskh",
        },
      ];
    } catch (error) {
      console.error("[KISSKH] Error Get streams by title", error.message);
    }
    return null;
  }

  cleanSearchTitle(title, year = null) {
    if (!title) return "";

    // Remove year if already present
    let cleanTitle = title.replace(/\s*\(\d{4}\)\s*$/, "");

    // Remove common suffixes that might hinder search
    cleanTitle = cleanTitle.replace(
      /\s*(?:-\s*(?:The Movie|Series|Drama))\s*$/i,
      "",
    );

    // Add year if provided for better search results
    if (year) {
      cleanTitle = `${cleanTitle} ${year}`;
    }

    return cleanTitle.trim();
  }

  bestMatch(results, title) {
    const options = {
      keys: ["title"],
      includeScore: true,
      threshold: 0.2, // 0.0 is a perfect match, 1.0 matches everything
    };

    const fuse = new Fuse(results, options);
    const result = fuse.search(title);

    console.log(result[0].item.title);
    return result[0].item;
  }

  findBestMatch(results, originalTitle, targetYear = null) {
    if (results.length === 0) return null;

    let bestMatch = results[0];
    let bestScore = 0;

    results.forEach((result) => {
      let score = 0;

      // Title similarity (case-insensitive)
      const resultTitle = result.title.toLowerCase();
      const searchTitle = originalTitle.toLowerCase();

      if (
        resultTitle.includes(searchTitle) ||
        searchTitle.includes(resultTitle)
      ) {
        score += 10;
      }

      // Year matching
      if (targetYear) {
        const resultYear = this.extractYearFromTitle(result.title);
        if (resultYear === targetYear) {
          score += 5;
        }
      }

      // Type matching
      if (result.type === originalTitle.type) {
        score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    });

    return bestMatch;
  }

  extractYearFromTitle(title) {
    const yearMatch = title.match(/\((\d{4})\)/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }

  getDemoStreams(imdbId, type, season, episode, title = "Content") {
    const demoStreams = [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        name: "AsiaView Demo Stream - High Quality",
        description: `Demo stream for ${title}`,
      },
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        name: "AsiaView Demo Stream - Medium Quality",
        description: `Alternative demo stream for ${title}`,
      },
    ];

    return demoStreams;
  }
}

module.exports = KissKHKISSKHr;
