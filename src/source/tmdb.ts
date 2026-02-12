import axios from "axios";
import console from "console";
import { ContentType } from "stremio-addon-sdk";
import { URLSearchParams } from "url";
import { envGetRequired } from "../lib/env.js";

interface ContentDetails {
  title: string;
  overview?: string;
  year: number;
  type: ContentType;
  tmdbId: string | number;
}

// interface SearchResult {
//   title: string;
//   overview?: string;
//   year: number | null;
//   type: "movie" | "series";
//   tmdbId: string | number;
//   imdbId: string | null;
// }

class TMDBService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = envGetRequired("TMDB_API_KEY");
    this.baseUrl = "https://api.themoviedb.org/3";
  }

  async getMovieDetails(imdbId: string): Promise<ContentDetails | null> {
    try {
      const findResponse = await this._makeRequest("/find/" + imdbId, {
        external_source: "imdb_id",
      });

      if (findResponse.movie_results && findResponse.movie_results.length > 0) {
        const movie = findResponse.movie_results[0];
        const year = new Date(movie.release_date).getFullYear();
        console.log(`[TMDB  ] Found | ${movie.title} (${year})`);
        return {
          title: movie.title,
          overview: movie.overview,
          year: year,
          type: "movie",
          tmdbId: movie.id,
        };
      }

      return null;
    } catch (error: any) {
      console.error("[TMDB  ] movie details error |", error.message);
      return null;
    }
  }

  async getSeriesDetails(imdbId: string): Promise<ContentDetails | null> {
    try {
      const findResponse = await this._makeRequest("/find/" + imdbId, {
        external_source: "imdb_id",
      });
      if (findResponse.tv_results && findResponse.tv_results.length > 0) {
        const series = findResponse.tv_results[0];
        const year = new Date(series.first_air_date).getFullYear();
        console.log(`[TMDB  ] Found | ${series.name} (${year})`);
        return {
          title: series.name,
          overview: series.overview,
          year: year,
          type: "series",
          tmdbId: series.id,
        };
      }

      return null;
    } catch (error: any) {
      console.error("[TMDB  ] Series details error |", error.message);
      return null;
    }
  }

  async getContentDetails(
    imdbId: string,
    type: ContentType,
  ): Promise<ContentDetails | null> {
    if (type === "series") {
      return await this.getSeriesDetails(imdbId);
    } else {
      return await this.getMovieDetails(imdbId);
    }
  }

  // async searchByTitle(
  //   title: string,
  //   type: ContentType,
  //   year: number | null = null,
  // ): Promise<SearchResult[]> {
  //   try {
  //     const searchType = type === "series" ? "tv" : "movie";
  //     const params: any = {
  //       query: title,
  //       page: 1,
  //     };

  //     if (year) {
  //       params.year = year;
  //     }

  //     const searchResponse = await this.makeRequest(
  //       "/search/" + searchType,
  //       params,
  //     );
  //     const results = searchResponse.results || [];

  //     const filteredResults = results.slice(0, 5).map(
  //       (item: any): SearchResult => ({
  //         title: item.title || item.name,
  //         overview: item.overview,
  //         year: item.release_date
  //           ? new Date(item.release_date).getFullYear()
  //           : item.first_air_date
  //             ? new Date(item.first_air_date).getFullYear()
  //             : null,
  //         type: searchType === "tv" ? "series" : "movie",
  //         tmdbId: item.id,
  //         imdbId: item.imdb_id,
  //       }),
  //     );

  //     return filteredResults;
  //   } catch (error: any) {
  //     console.error("[TMDB] Search error |", error.message);
  //     return [];
  //   }
  // }

  private async _makeRequest(
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<any> {
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
}

export default TMDBService;
