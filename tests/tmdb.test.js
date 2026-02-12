// const TMDBService = require('../src/source/tmdb');

// describe('TMDB Service Tests', () => {
//   let tmdbService;

//   beforeEach(() => {
//     tmdbService = new TMDBService();
//   });

//   describe('Constructor', () => {
//     test('should initialize with API key from environment', () => {
//       const originalEnv = process.env.TMDB_API_KEY;
//       process.env.TMDB_API_KEY = 'test-key';

//       const service = new TMDBService();
//       expect(service.apiKey).toBe('test-key');

//       process.env.TMDB_API_KEY = originalEnv;
//     });

//     test('should initialize without API key', () => {
//       const originalEnv = process.env.TMDB_API_KEY;
//       delete process.env.TMDB_API_KEY;

//       const service = new TMDBService();
//       expect(service.apiKey).toBeUndefined();
//       expect(service.fallbackMode).toBe(false);

//       process.env.TMDB_API_KEY = originalEnv;
//     });
//   });

//   describe('getMovieDetails', () => {
//     test('should return movie details for known IMDB ID', async () => {
//       const result = await tmdbService.getMovieDetails('tt6751668');

//       expect(result).not.toBeNull();
//       expect(result.title).toBe('Parasite');
//       expect(result.type).toBe('movie');
//       expect(result.year).toBe(2019);
//       expect(result.tmdbId).toBeDefined();
//     });

//     test('should return fallback data for unknown IMDB ID', async () => {
//       const result = await tmdbService.getMovieDetails('tt0000000');

//       expect(result).not.toBeNull();
//       expect(result.title).toContain('Demo Content');
//       expect(result.type).toBe('movie');
//     });

//     test('should handle errors gracefully', async () => {
//       // Force fallback mode
//       tmdbService.fallbackMode = true;

//       const result = await tmdbService.getMovieDetails('tt6751668');
//       expect(result).not.toBeNull();
//       expect(result.title).toBe('Parasite');
//     });
//   });

//   describe('getSeriesDetails', () => {
//     test('should return series details for known IMDB ID', async () => {
//       const result = await tmdbService.getSeriesDetails('tt4619332');

//       expect(result).not.toBeNull();
//       expect(result.title).toBe('Squid Game');
//       expect(result.type).toBe('series');
//       expect(result.year).toBe(2021);
//       expect(result.tmdbId).toBeDefined();
//     });

//     test('should return fallback data for unknown IMDB ID', async () => {
//       const result = await tmdbService.getSeriesDetails('tt0000000');

//       expect(result).not.toBeNull();
//       expect(result.title).toContain('Demo Content');
//       expect(result.type).toBe('series');
//     });
//   });

//   describe('getContentDetails', () => {
//     test('should route to movie details for movie type', async () => {
//       const result = await tmdbService.getContentDetails('tt6751668', 'movie');

//       expect(result).not.toBeNull();
//       expect(result.type).toBe('movie');
//     });

//     test('should route to series details for series type', async () => {
//       const result = await tmdbService.getContentDetails('tt4619332', 'series');

//       expect(result).not.toBeNull();
//       expect(result.type).toBe('series');
//     });
//   });

//   describe('searchByTitle', () => {
//     test('should return search results for movie title', async () => {
//       const results = await tmdbService.searchByTitle('Parasite', 'movie', 2019);

//       expect(results).toBeInstanceOf(Array);
//       expect(results.length).toBeGreaterThan(0);
//       expect(results[0].title).toBe('Parasite');
//       expect(results[0].type).toBe('movie');
//       expect(results[0].year).toBe(2019);
//     });

//     test('should return search results for series title', async () => {
//       const results = await tmdbService.searchByTitle('Squid Game', 'series', 2021);

//       expect(results).toBeInstanceOf(Array);
//       expect(results.length).toBeGreaterThan(0);
//       expect(results[0].title).toBe('Squid Game');
//       expect(results[0].type).toBe('series');
//       expect(results[0].year).toBe(2021);
//     });

//     test('should handle year parameter correctly', async () => {
//       const results = await tmdbService.searchByTitle('Test Movie', 'movie', 2023);

//       expect(results[0].year).toBe(2023);
//     });
//   });

//   describe('getSearchTitle', () => {
//     test('should clean title properly', () => {
//       const content = { title: 'Parasite (2019)' };
//       const cleanedTitle = tmdbService.getSearchTitle(content);

//       expect(cleanedTitle).toBe('Parasite');
//     });

//     test('should remove suffixes', () => {
//       const content = { title: 'Movie Title - The Movie' };
//       const cleanedTitle = tmdbService.getSearchTitle(content);

//       expect(cleanedTitle).toBe('Movie Title');
//     });

//     test('should handle empty or null input', () => {
//       expect(tmdbService.getSearchTitle(null)).toBe('');
//       expect(tmdbService.getSearchTitle({})).toBe('');
//       expect(tmdbService.getSearchTitle({ title: '' })).toBe('');
//     });
//   });

//   describe('Fallback Mode', () => {
//     test('should enable fallback mode on API errors', async () => {
//       // Simulate API failure by setting invalid API key
//       tmdbService.apiKey = 'invalid-key';

//       const result = await tmdbService.getMovieDetails('tt6751668');

//       expect(tmdbService.fallbackMode).toBe(true);
//       expect(result).not.toBeNull();
//     });

//     test('should work entirely in fallback mode', async () => {
//       tmdbService.fallbackMode = true;

//       const movie = await tmdbService.getMovieDetails('tt6751668');
//       const series = await tmdbService.getSeriesDetails('tt4619332');
//       const search = await tmdbService.searchByTitle('Test', 'movie');

//       expect(movie.title).toBe('Parasite');
//       expect(series.title).toBe('Squid Game');
//       expect(search.length).toBeGreaterThan(0);
//     });
//   });
// });
