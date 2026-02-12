// const KissKHScraperr = require('../src/source/kisskh');

// describe('KissKH Scraper Tests', () => {
//   let scraper;

//   beforeEach(() => {
//     scraper = new KissKHScraperr();
//   });

//   describe('Constructor', () => {
//     test('should initialize with correct base URLs', () => {
//       expect(scraper.baseUrl).toBe('https://kisskh.fan');
//       expect(scraper.contentDomain).toBe('https://kisskh.me.in');
//     });

//     test('should have proper headers configured', () => {
//       expect(scraper.headers['User-Agent']).toContain('Mozilla/5.0');
//       expect(scraper.headers['Accept']).toContain('text/html');
//     });
//   });

//   describe('searchContent', () => {
//     test('should return empty array for invalid title', async () => {
//       const results = await scraper.searchContent('', 'movie');
//       expect(results).toEqual([]);
//     });

//     test('should search with different title formats', async () => {
//       const testCases = [
//         { title: 'Project', type: 'movie' },
//         { title: 'Parasite 2019', type: 'movie' },
//         { title: 'Squid Game', type: 'series' }
//       ];

//       for (const testCase of testCases) {
//         const results = await scraper.searchContent(testCase.title, testCase.type);
//         expect(Array.isArray(results)).toBe(true);
//       }
//     });

//     test('should handle search errors gracefully', async () => {
//       // Mock console.error to verify error handling
//       const originalError = console.error;
//       console.error = jest.fn();

//       const results = await scraper.searchContent('invalid-title-12345', 'movie');
//       expect(results).toEqual([]);

//       console.error = originalError;
//     });
//   });

//   describe('getStreamsByTitle', () => {
//     test('should return streams for valid title', async () => {
//       const streams = await scraper.getStreamsByTitle('Parasite', 'movie', 2019);

//       expect(Array.isArray(streams)).toBe(true);
//       expect(streams.length).toBeGreaterThan(0);
//       expect(streams[0]).toHaveProperty('url');
//       expect(streams[0]).toHaveProperty('name');
//       expect(streams[0]).toHaveProperty('description');
//     });

//     test('should handle series with episode parameters', async () => {
//       const streams = await scraper.getStreamsByTitle('Squid Game', 'series', 2021, 1, 1);

//       expect(Array.isArray(streams)).toBe(true);
//       expect(streams.length).toBeGreaterThan(0);
//     });

//     test('should return demo streams when no search results found', async () => {
//       const streams = await scraper.getStreamsByTitle('NonExistentTitle123', 'movie');

//       expect(streams.length).toBe(2); // Should return 2 demo streams
//       expect(streams[0].url).toContain('sample/BigBuckBunny.mp4');
//       expect(streams[1].url).toContain('sample/ElephantsDream.mp4');
//     });

//     test('should handle errors gracefully', async () => {
//       const streams = await scraper.getStreamsByTitle(null, 'movie');

//       expect(Array.isArray(streams)).toBe(true);
//       expect(streams.length).toBe(2); // Should return demo streams
//     });
//   });

//   describe('cleanSearchTitle', () => {
//     test('should clean title with year', () => {
//       const cleaned = scraper.cleanSearchTitle('Parasite (2019)', 2019);
//       expect(cleaned).toBe('Parasite 2019');
//     });

//     test('should clean title without year', () => {
//       const cleaned = scraper.cleanSearchTitle('Parasite (2019)', null);
//       expect(cleaned).toBe('Parasite');
//     });

//     test('should remove common suffixes', () => {
//       const cleaned = scraper.cleanSearchTitle('Movie Title - The Movie');
//       expect(cleaned).toBe('Movie Title');
//     });

//     test('should handle empty title', () => {
//       const cleaned = scraper.cleanSearchTitle('', 2023);
//       expect(cleaned).toBe('');
//     });

//     test('should handle null title', () => {
//       const cleaned = scraper.cleanSearchTitle(null, 2023);
//       expect(cleaned).toBe('');
//     });
//   });

//   describe('findBestMatch', () => {
//     test('should find best match based on title similarity', () => {
//       const results = [
//         { title: 'Parasite (2019)', type: 'movie' },
//         { title: 'Parasite 2', type: 'movie' },
//         { title: 'Different Movie', type: 'movie' }
//       ];

//       const bestMatch = scraper.findBestMatch(results, 'Parasite', 2019);
//       expect(bestMatch.title).toBe('Parasite (2019)');
//     });

//     test('should handle empty results array', () => {
//       const bestMatch = scraper.findBestMatch([], 'Test Title');
//       expect(bestMatch).toBeNull();
//     });

//     test('should return first result when no clear match', () => {
//       const results = [
//         { title: 'Random Movie 1', type: 'movie' },
//         { title: 'Random Movie 2', type: 'movie' }
//       ];

//       const bestMatch = scraper.findBestMatch(results, 'Completely Different');
//       expect(bestMatch.title).toBe('Random Movie 1');
//     });
//   });

//   describe('extractYearFromTitle', () => {
//     test('should extract year from title with parentheses', () => {
//       const year = scraper.extractYearFromTitle('Parasite (2019)');
//       expect(year).toBe(2019);
//     });

//     test('should return null when no year found', () => {
//       const year = scraper.extractYearFromTitle('Parasite');
//       expect(year).toBeNull();
//     });

//     test('should handle malformed year', () => {
//       const year = scraper.extractYearFromTitle('Parasite (19)');
//       expect(year).toBeNull();
//     });
//   });

//   describe('extractEpisodeNumber', () => {
//     test('should extract episode number from text', () => {
//       const episodeNum = scraper.extractEpisodeNumber('Episode 5');
//       expect(episodeNum).toBe(5);
//     });

//     test('should be case insensitive', () => {
//       const episodeNum = scraper.extractEpisodeNumber('EPISODE 3');
//       expect(episodeNum).toBe(3);
//     });

//     test('should return null when no episode number found', () => {
//       const episodeNum = scraper.extractEpisodeNumber('No episode here');
//       expect(episodeNum).toBeNull();
//     });
//   });

//   describe('getStreams', () => {
//     test('should handle movie stream extraction', async () => {
//       // Mock URL that might exist
//       const testUrl = '/drama/test-movie';

//       const streams = await scraper.getStreams(testUrl, 'movie');
//       expect(Array.isArray(streams)).toBe(true);
//     });

//     test('should handle series stream extraction with episode', async () => {
//       const testUrl = '/drama/test-series';

//       const streams = await scraper.getStreams(testUrl, 'series', 1, 1);
//       expect(Array.isArray(streams)).toBe(true);
//     });

//     test('should handle network errors', async () => {
//       const invalidUrl = 'https://invalid-domain-12345.com/movie';

//       const streams = await scraper.getStreams(invalidUrl, 'movie');
//       expect(Array.isArray(streams)).toBe(true);
//     });
//   });

//   describe('extractVideoUrl', () => {
//     test('should handle HTML parsing safely', () => {
//       // Mock cheerio object with no video elements
//       const mockCheerio = () => ({
//         find: jest.fn().mockReturnValue([]),
//         each: jest.fn(),
//         text: () => ''
//       });

//       expect(() => {
//         const result = scraper.extractVideoUrl(mockCheerio);
//         expect(result).toBeNull();
//       }).not.toThrow();
//     });
//   });

//   describe('browsePopularContent', () => {
//     test('should handle homepage browsing', async () => {
//       const results = await scraper.browsePopularContent('Project', 'movie');
//       expect(Array.isArray(results)).toBe(true);
//     });

//     test('should handle network errors during browsing', async () => {
//       // Mock network error
//       const originalHeaders = scraper.headers;
//       scraper.headers = null;

//       const results = await scraper.browsePopularContent('Test', 'movie');
//       expect(Array.isArray(results)).toBe(true);
//       expect(results).toEqual([]);

//       scraper.headers = originalHeaders;
//     });
//   });

//   describe('getDemoStreams', () => {
//     test('should return demo streams with default title', () => {
//       const streams = scraper.getDemoStreams('test123', 'movie');

//       expect(streams.length).toBe(2);
//       expect(streams[0].name).toContain('High Quality');
//       expect(streams[1].name).toContain('Medium Quality');
//       expect(streams[0].description).toContain('Content');
//     });

//     test('should return demo streams with custom title', () => {
//       const streams = scraper.getDemoStreams('test123', 'movie', 1, 1, 'Custom Title');

//       expect(streams.length).toBe(2);
//       expect(streams[0].description).toContain('Custom Title');
//       expect(streams[1].description).toContain('Custom Title');
//     });
//   });
// });

const KissKHScraperr = require("../src/source/kisskh");
describe("KissKH Scraper Tests", () => {
  let scraper;

  beforeEach(() => {
    scraper = new KissKHScraperr();
  });

  describe("Get correct streams", () => {
    test("Get correct links", async () => {
      const content = await scraper.searchContent("Single's Inferno", "series");
      // .expect(scraper.baseUrl)
      // .toBe("https://kisskh.fan");
      // expect(scraper.contentDomain).toBe("https://kisskh.me.in");
      console.log(`[TEST] Content ${content}`);
      expect(content).toBe(!"");
    });
  });
});
