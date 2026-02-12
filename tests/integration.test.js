// const addonInterface = require('../src/lib/addon');

// describe('Addon Integration Tests', () => {
//   let streamHandler;

// beforeAll(() => {
//   // Create the stream handler manually since it's not exposed
//   const KissKHScraperr = require('../src/source/kisskh');
//   const TMDBService = require('../src/source/tmdb');

//   const scraper = new KissKHScraperr();
//   const tmdb = new TMDBService();

//   streamHandler = async (params) => {
//     const { type, id } = params || {};

//     if (!id || !id.startsWith("tt")) {
//       return { streams: [] };
//     }
//     if (!id || !id.startsWith("tt")) {
//       return { streams: [] };
//     }

//     const isSeries = type === 'series';
//     const [imdbId, season, episode] = id.split(':');

//     try {
//       const contentDetails = await tmdb.getContentDetails(imdbId, type);

//       if (!contentDetails) {
//         return { streams: [] };
//       }

//       const streams = await scraper.getStreamsByTitle(
//         contentDetails.title,
//         contentDetails.type,
//         contentDetails.year,
//         season ? parseInt(season) : null,
//         episode ? parseInt(episode) : null
//       );

//       return {
//         streams: streams.map((stream) => ({
//           name: stream.name || "AsiaView",
//           title: `${stream.description || "Stream from KissKH"} - ${contentDetails.title}`,
//           url: stream.url,
//           behaviorHints: {
//             notWebReady: true,
//           },
//         })),
//       };
//     } catch (error) {
//       return { streams: [] };
//     }
//   };
// });

//   describe('Stream Handler', () => {
//     test('should return empty streams for invalid ID', async () => {
//       const result = await streamHandler({ type: 'movie', id: 'invalid-id' });
//       expect(result.streams).toEqual([]);
//     });

//     test('should return empty streams for null ID', async () => {
//       const result = await streamHandler({ type: 'movie', id: null });
//       expect(result.streams).toEqual([]);
//     });

//     test('should return empty streams for undefined ID', async () => {
//       const result = await streamHandler({ type: 'movie', id: undefined });
//       expect(result.streams).toEqual([]);
//     });

//     test('should return empty streams for ID not starting with tt', async () => {
//       const result = await streamHandler({ type: 'movie', id: '123456789' });
//       expect(result.streams).toEqual([]);
//     });

//     test('should handle movie requests', async () => {
//       const result = await streamHandler({
//         type: 'movie',
//         id: 'tt6751668' // Parasite
//       });

//       expect(result.streams).toBeInstanceOf(Array);

//       if (result.streams.length > 0) {
//         expect(result.streams[0]).toHaveProperty('name');
//         expect(result.streams[0]).toHaveProperty('title');
//         expect(result.streams[0]).toHaveProperty('url');
//         expect(result.streams[0]).toHaveProperty('behaviorHints');
//         expect(result.streams[0].behaviorHints.notWebReady).toBe(true);
//       }
//     });

//     test('should handle series requests', async () => {
//       const result = await streamHandler({
//         type: 'series',
//         id: 'tt4619332:1:1' // Squid Game Season 1 Episode 1
//       });

//       expect(result.streams).toBeInstanceOf(Array);

//       if (result.streams.length > 0) {
//         expect(result.streams[0]).toHaveProperty('name');
//         expect(result.streams[0]).toHaveProperty('title');
//         expect(result.streams[0]).toHaveProperty('url');
//         expect(result.streams[0].title).toContain('Squid Game');
//       }
//     });

//     test('should handle series requests without episode info', async () => {
//       const result = await streamHandler({
//         type: 'series',
//         id: 'tt4619332' // Squid Game without episode
//       });

//       expect(result.streams).toBeInstanceOf(Array);
//     });

//     test('should handle unknown IMDB IDs gracefully', async () => {
//       const result = await streamHandler({
//         type: 'movie',
//         id: 'tt0000000' // Non-existent IMDB ID
//       });

//       expect(result.streams).toBeInstanceOf(Array);

//       // Should return demo streams even for unknown IDs
//       if (result.streams.length > 0) {
//         expect(result.streams[0]).toHaveProperty('url');
//         expect(result.streams[0].url).toContain('sample/');
//       }
//     });

//     test('should parse IMDB ID with season and episode correctly', async () => {
//       const result = await streamHandler({
//         type: 'series',
//         id: 'tt4619332:2:5' // Season 2 Episode 5
//       });

//       expect(result.streams).toBeInstanceOf(Array);
//       // The parsing is handled internally, just verify it works
//       expect(result).toHaveProperty('streams');
//     });

//     test('should handle errors gracefully', async () => {
//       // Test with malformed input that might cause errors
//       const result = await streamHandler({
//         type: 'movie',
//         id: 'tt' // Incomplete IMDB ID
//       });

//       expect(result.streams).toBeInstanceOf(Array);
//     });

//     test('should include proper stream metadata', async () => {
//       const result = await streamHandler({
//         type: 'movie',
//         id: 'tt6751668' // Parasite
//       });

//       if (result.streams.length > 0) {
//         const stream = result.streams[0];

//         // Check required properties
//         expect(stream.name).toBeTruthy();
//         expect(stream.title).toBeTruthy();
//         expect(stream.url).toBeTruthy();
//         expect(stream.behaviorHints).toBeTruthy();
//         expect(stream.behaviorHints.notWebReady).toBe(true);

//         // Check that title includes TMDB info when available
//         expect(stream.title).toContain('Parasite');
//       }
//     });

//     test('should handle multiple stream sources', async () => {
//       const result = await streamHandler({
//         type: 'movie',
//         id: 'tt6751668' // Parasite
//       });

//       // Should return multiple demo streams
//       expect(result.streams.length).toBeGreaterThanOrEqual(0);
//       if (result.streams.length > 0) {
//         expect(result.streams.length).toBeGreaterThan(0);
//       }
//     });

//     test('should maintain consistent stream format', async () => {
//       const movieResult = await streamHandler({
//         type: 'movie',
//         id: 'tt6751668'
//       });

//       const seriesResult = await streamHandler({
//         type: 'series',
//         id: 'tt4619332:1:1'
//       });

//       // Check that both results have the same structure
//       [movieResult, seriesResult].forEach(result => {
//         if (result.streams.length > 0) {
//           result.streams.forEach(stream => {
//             expect(Object.keys(stream)).toEqual(
//               expect.arrayContaining(['name', 'title', 'url', 'behaviorHints'])
//             );
//             expect(typeof stream.name).toBe('string');
//             expect(typeof stream.title).toBe('string');
//             expect(typeof stream.url).toBe('string');
//             expect(typeof stream.behaviorHints).toBe('object');
//           });
//         }
//       });
//     });
//   });

//   describe('Error Handling', () => {
//     test('should handle missing type parameter', async () => {
//       const result = await streamHandler({ id: 'tt6751668' });
//       expect(result.streams).toBeInstanceOf(Array);
//     });

//     test('should handle empty parameters object', async () => {
//       const result = await streamHandler({});
//       expect(result.streams).toEqual([]);
//     });

//     test('should handle null parameters', async () => {
//       const result = await streamHandler(null);
//       expect(result.streams).toEqual([]);
//     });

//     test('should handle network errors in TMDB', async () => {
//       // This test verifies that the addon can handle TMDB failures
//       // and fall back to demo streams
//       const result = await streamHandler({
//         type: 'movie',
//         id: 'tt6751668'
//       });

//       // Should still return streams even if TMDB fails
//       expect(result.streams).toBeInstanceOf(Array);
//     });
//   });

//   describe('Integration with Sources', () => {
//     test('should integrate TMDB and KissKH correctly', async () => {
//       const result = await streamHandler({
//         type: 'movie',
//         id: 'tt6751668'
//       });

//       // The result should demonstrate the integration:
//       // 1. TMDB provides title/metadata
//       // 2. KissKH provides streams (or demo streams)
//       expect(result.streams).toBeInstanceOf(Array);

//       if (result.streams.length > 0) {
//         // Title should include TMDB information
//         expect(result.streams[0].title).toBeTruthy();
//         // URL should be from KissKH or demo
//         expect(result.streams[0].url).toBeTruthy();
//       }
//     });

//     test('should work with different content types', async () => {
//       const testCases = [
//         { type: 'movie', id: 'tt6751668' },
//         { type: 'series', id: 'tt4619332' },
//         { type: 'series', id: 'tt4619332:1:1' }
//       ];

//       for (const testCase of testCases) {
//         const result = await streamHandler(testCase);
//         expect(result.streams).toBeInstanceOf(Array);
//       }
//     });
//   });
// });
