const { envGet, envGetRequired } = require("../lib/env");
class TMDBService {
  constructor() {
    this.apiKey = envGetRequired("TMDB_API_KEY");
    this.baseUrl = "https://api.themoviedb.org/3";
    this.fallbackMode = false;
  }

  async getMovieDetails(imdbId) {
    if (this.fallbackMode || !this.apiKey) {
      // return this.getFallbackDetails(imdbId, 'movie');
      return null;
    }

    try {
      // First find the movie using IMDB ID
      const findResponse = await this.makeRequest("/find/" + imdbId, {
        external_source: "imdb_id",
      });

      if (findResponse.movie_results && findResponse.movie_results.length > 0) {
        const movie = findResponse.movie_results[0];
        return {
          title: movie.title,
          overview: movie.overview,
          year: new Date(movie.release_date).getFullYear(),
          type: "movie",
          tmdbId: movie.id,
        };
      }

      return null;
    } catch (error) {
      console.error("[TMDB] movie details error:", error.message);
      console.log("[TMDB] Falling back to demo mode");
      this.fallbackMode = true;
      return this.getFallbackDetails(imdbId, "movie");
    }
  }

  async getSeriesDetails(imdbId) {
    if (this.fallbackMode || !this.apiKey) {
      // return this.getFallbackDetails(imdbId, "series");
      return null;
    }

    try {
      // First find the series using IMDB ID
      const findResponse = await this.makeRequest("/find/" + imdbId, {
        external_source: "imdb_id",
      });
      if (findResponse.tv_results && findResponse.tv_results.length > 0) {
        const series = findResponse.tv_results[0];
        console.log(`[TMDB] Found ${series.name} ${series.year}`);
        return {
          title: series.name,
          overview: series.overview,
          year: new Date(series.first_air_date).getFullYear(),
          type: "series",
          tmdbId: series.id,
        };
      }

      return null;
    } catch (error) {
      console.error("TMDB series details error:", error.message);
      console.log("[TMDB] Falling back to demo mode");
      this.fallbackMode = true;
      return this.getFallbackDetails(imdbId, "series");
    }
  }

  async getContentDetails(imdbId, type) {
    if (type === "series") {
      return await this.getSeriesDetails(imdbId);
    } else {
      return await this.getMovieDetails(imdbId);
    }
  }

  async searchByTitle(title, type = "movie", year = null) {
    if (this.fallbackMode || !this.apiKey) {
      return this.getFallbackSearch(title, type, year);
    }

    try {
      const axios = require("axios");
      const searchType = type === "series" ? "tv" : "movie";
      const params = {
        query: title,
        page: 1,
      };

      if (year) {
        params.year = year;
      }

      const searchResponse = await this.makeRequest(
        "/search/" + searchType,
        params,
      );
      const results = searchResponse.results || [];

      // Map results to our format
      const filteredResults = results
        .slice(0, 5) // Limit to top 5 results
        .map((item) => ({
          title: item.title || item.name,
          overview: item.overview,
          year: item.release_date
            ? new Date(item.release_date).getFullYear()
            : item.first_air_date
              ? new Date(item.first_air_date).getFullYear()
              : null,
          type: searchType === "tv" ? "series" : "movie",
          tmdbId: item.id,
          imdbId: item.imdb_id,
        }));

      return filteredResults;
    } catch (error) {
      console.error("TMDB search error:", error.message);
      console.log("[TMDB] Falling back to demo mode");
      this.fallbackMode = true;
      return this.getFallbackSearch(title, type, year);
    }
  }

  async makeRequest(endpoint, params = {}) {
    const axios = require("axios");
    const url = `${this.baseUrl}${endpoint}`;
    const queryParams = new URLSearchParams({
      api_key: this.apiKey,
      ...params,
    });
    const config = {
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
      },
      queueLimit: 50,
    };
    const response = await axios.get(`${url}?${queryParams}`, config);
    return response.data;
  }

  getFallbackDetails(imdbId, type) {
    // Mock data based on known content for demonstration
    const mockData = {
      tt6751668: { title: "Parasite", year: 2019, type: "movie" }, // Korean movie
      tt4619332: { title: "Squid Game", year: 2021, type: "series" }, // Korean series
      tt8579674: { title: "Train to Busan", year: 2016, type: "movie" }, // Korean movie
      tt1520211: { title: "The Handmaiden", year: 2016, type: "movie" }, // Korean movie
      tt10872600: { title: "Minari", year: 2020, type: "movie" }, // Korean-American movie
    };

    const data = mockData[imdbId];
    if (data && data.type === type) {
      return {
        title: data.title,
        overview: `Demo overview for ${data.title}`,
        year: data.year,
        type: data.type,
        tmdbId: imdbId,
      };
    }

    // Generic fallback
    return {
      title: `Demo Content ${imdbId}`,
      overview: "Demo content for testing purposes",
      year: 2023,
      type: type,
      tmdbId: imdbId,
    };
  }

  getFallbackSearch(title, type, year) {
    console.log(`[TMDB] Fallback search for: ${title} (${type})`);

    return [
      {
        title: title,
        overview: `Demo search result for ${title}`,
        year: year || 2023,
        type: type,
        tmdbId: "demo123",
        imdbId: null,
      },
    ];
  }

  getSearchTitle(content) {
    if (!content) return "";

    // Clean title for better search results
    let title = content.title || "";

    // Remove year if present in parentheses
    title = title.replace(/\s*\(\d{4}\)\s*$/, "");

    // Remove common suffixes that might hinder search
    title = title.replace(/\s*(?:-\s*(?:The Movie|Series|Drama))\s*$/i, "");

    return title.trim();
  }
}

module.exports = TMDBService;
