import axios, { AxiosRequestConfig } from "axios";
import { ContentType } from "stremio-addon-sdk";
import { URLSearchParams } from "url";
import { envGetRequired } from "../utils/env.js";
import { BaseMeta, ContentDetail } from "./meta.js";

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
}

export interface TmdbMovieResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
}

class TMDBService extends BaseMeta {
  private apiKey: string = envGetRequired("TMDB_API_KEY");
  private baseUrl: string = "https://api.themoviedb.org/3";

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
        this.logger.log(`Get | ${series.name} ${year}`);
        return {
          id: series.id.toString(),
          title: series.name,
          overview: series.overview,
          year: year,
          type: "series",
          tmdbId: series.id,
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
    const url = `${this.baseUrl}${endpoint}`;
    const queryParams = new URLSearchParams({
      ...params,
    });
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
      },
    };
    this.logger.log(`${url}?${queryParams}`);
    const response = await axios.get(`${url}?${queryParams}`, config);
    return response.data;
  }
}

export default TMDBService;
