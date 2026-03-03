import axios, { AxiosRequestConfig } from "axios";
import { ContentType } from "stremio-addon-sdk";
import { URLSearchParams } from "url";
import { ENV } from "../utils/env.js";
import {
  extractTitleYear,
  matchTitle,
  normalize,
  Search,
} from "../utils/fuse.js";
import { BaseMeta, ContentDetail } from "./meta.js";
import { Provider } from "./provider.js";

export interface TmdbFindResponse {
  movie_results: TmdbMovieResult[];
  person_results: any[];
  tv_results: TmdbTvResult[];
  tv_episode_results: any[];
  tv_season_results: any[];
}

export interface TmdbTvResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string;
}

export interface TmdbMovieResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string;
}

interface TmdbSeach extends Search {}

interface TmdbMovieSearch {
  results: TmdbMovieResult[];
}
interface TmdbTvSearch {
  results: TmdbTvResult[];
}

class TMDBService extends BaseMeta {
  private apiKey: string = ENV.TMDB_API_KEY;
  private baseUrl: string = "https://api.themoviedb.org/3";
  private imageUrl: string = "https://image.tmdb.org";

  async searchDetailImdb(
    search: string,
    type: ContentType,
    year?: number,
  ): Promise<ContentDetail | null> {
    const extracted = extractTitleYear(search);
    search = extracted.title;
    year = year ? year : extracted.year;
    if (type === "series") {
      return await this.searchSeriesDetail(search, year);
    } else {
      return await this.searchMovieDetail(search, year);
    }
  }

  async findDetailImdb(
    imdbId: string,
    type: ContentType,
  ): Promise<ContentDetail | null> {
    if (type === "series") {
      return await this.findSeriesDetail(imdbId);
    } else {
      return await this.findMovieDetail(imdbId);
    }
  }

  async getDetailTmdb(
    tmdbId: string,
    type: ContentType,
  ): Promise<ContentDetail | null> {
    if (type === "series") {
      return await this.getSeriesDetail(tmdbId);
    } else {
      return await this.getMovieDetail(tmdbId);
    }
  }

  async getSearchSeries(title: string, year?: number): Promise<TmdbTvSearch> {
    const param = { query: title, year: year };
    return await this._getRequest(`/search/tv`, param);
  }

  async searchSeriesDetail(
    title: string,
    year?: number,
  ): Promise<ContentDetail | null> {
    try {
      const response = await this.getSearchSeries(title, year);
      const titles = response.results.map((result) => {
        const year = new Date(result.first_air_date).getFullYear();
        const thumbnail = result.poster_path
          ? `${this.imageUrl}/t/p/w500${result.poster_path}`
          : "";
        const search: ContentDetail = {
          id: result.id.toString(),
          title: result.name,
          overview: result.overview,
          thumbnail: thumbnail,
          year: year,
          type: "movie",
          tmdbId: result.id,
        };
        return search;
      });
      const detail = matchTitle<ContentDetail>(titles, title, year);
      const tv = detail[0];
      if (tv) return tv;
      return null;
    } catch (error: any) {
      this.logger.error(`Movie details error | ${error.message}`);
      return null;
    }
  }

  async getSearchMovie(title: string, year?: number): Promise<TmdbMovieSearch> {
    const param = { query: title, year: year };
    return await this._getRequest(`/search/movie`, param);
  }

  async searchMovieDetail(
    title: string,
    year?: number,
  ): Promise<ContentDetail | null> {
    try {
      const movieResponse = await this.getSearchMovie(title, year);
      const results = movieResponse.results.map((movie) => {
        const year = new Date(movie.release_date).getFullYear();
        const thumbnail = `${this.imageUrl}/t/p/w500${movie.poster_path}`;
        const search: ContentDetail = {
          id: movie.id.toString(),
          title: movie.title,
          overview: movie.overview,
          thumbnail: thumbnail,
          year: year,
          type: "movie",
          tmdbId: movie.id,
        };
        return search;
      });
      const movie = matchTitle(results, title, year)[0];
      if (movie) return movie;
      return null;
    } catch (error: any) {
      this.logger.error(`Movie details error | ${error.message}`);
      return null;
    }
  }

  async findMovieDetail(imdbId: string): Promise<ContentDetail | null> {
    try {
      const movieResponse: TmdbFindResponse = await this._getRequest(
        "/find/" + imdbId,
        {
          external_source: "imdb_id",
        },
      );
      const movie = movieResponse.movie_results?.[0];

      if (movie) {
        const year = new Date(movie.release_date).getFullYear();
        this.logger.log(`Found | ${movie.title} ${year}`);
        return {
          id: imdbId,
          title: movie.title,
          overview: movie.overview,
          year: year,
          type: "movie",
          tmdbId: movie.id,
        };
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Movie details error | ${error.message}`);
      return null;
    }
  }

  async findSeriesDetail(imdbId: string): Promise<ContentDetail | null> {
    try {
      const seriesResponse: TmdbFindResponse = await this._getRequest(
        "/find/" + imdbId,
        {
          external_source: "imdb_id",
        },
      );
      this.logger.debug(JSON.stringify(seriesResponse));
      const series = seriesResponse.tv_results[0];
      if (series) {
        const year = new Date(series.first_air_date).getFullYear();
        this.logger.log(`Found | ${series.name} ${year}`);
        return {
          id: imdbId,
          title: series.name,
          overview: series.overview,
          year: year,
          type: "series",
          tmdbId: series.id,
        };
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Series details error | ${error.message}`);
      return null;
    }
  }

  async getMovieDetail(tmdbId: string): Promise<ContentDetail | null> {
    try {
      const movie: TmdbMovieResult = await this._getRequest("/movie/" + tmdbId);

      if (movie) {
        const year = new Date(movie.release_date).getFullYear();
        const thumbnail = `${this.imageUrl}/t/p/w500${movie.poster_path}`;
        this.logger.log(`Get | ${movie.title} ${year}`);
        return {
          id: movie.id.toString(),
          title: movie.title,
          overview: movie.overview,
          year: year,
          type: "movie",
          tmdbId: movie.id,
        };
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Get movie details error | ${error.message}`);
      return null;
    }
  }

  async getSeriesDetail(id: string): Promise<ContentDetail | null> {
    this.logger.debug(`ID ${id}`);
    try {
      const series: TmdbTvResult = await this._getRequest("/tv/" + id);
      if (series) {
        const year = new Date(series.first_air_date).getFullYear();
        const thumbnail = `${this.imageUrl}/t/p/w500${series.poster_path}`;
        this.logger.log(`Get | ${series.name} ${year}`);
        return {
          id: series.id.toString(),
          title: series.name,
          overview: series.overview,
          year: year,
          type: "series",
          tmdbId: series.id,
          thumbnail: thumbnail,
        };
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Get series details error | ${error.message}`);
      return null;
    }
  }

  private async _getRequest(
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<any> {
    const queryParams = new URLSearchParams({
      ...params,
    });
    const url = `${this.baseUrl}${endpoint}?${queryParams}`;
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
      },
    };
    this.logger.log(`GET | ${url}`);
    const response = await axios.get(`${url}`, config);
    return response.data;
  }
}

export const tmdb = new TMDBService(Provider.TMDB);
