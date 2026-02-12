const TMDBService = require('../src/source/tmdb');
const KissKHScraperr = require('../src/source/kisskh');

class TestUtils {
  static createMockTMDBResponse() {
    return {
      movie_results: [{
        id: 496243,
        title: 'Parasite',
        overview: 'A poor family schemes to become employed by a wealthy family.',
        release_date: '2019-05-30'
      }],
      tv_results: [{
        id: 95057,
        name: 'Squid Game',
        overview: 'Hundreds of cash-strapped players accept a strange invitation.',
        first_air_date: '2021-09-17'
      }]
    };
  }

  static createMockSearchResults() {
    return {
      results: [
        {
          id: 496243,
          title: 'Parasite',
          overview: 'A poor family schemes to become employed by a wealthy family.',
          release_date: '2019-05-30',
          media_type: 'movie',
          imdb_id: 'tt6751668'
        },
        {
          id: 95057,
          name: 'Squid Game',
          overview: 'Hundreds of cash-strapped players accept a strange invitation.',
          first_air_date: '2021-09-17',
          media_type: 'tv',
          imdb_id: 'tt4619332'
        }
      ]
    };
  }

  static createMockKissKHResults() {
    return [
      {
        title: 'Parasite (2019)',
        link: 'https://kisskh.me.in/drama/parasite-2019/',
        type: 'movie'
      },
      {
        title: 'Squid Game (2021)',
        link: 'https://kisskh.me.in/drama/squid-game-2021/',
        type: 'series'
      }
    ];
  }

  static createMockStreams() {
    return [
      {
        url: 'https://example.com/stream1.m3u8',
        name: 'AsiaView Stream - High Quality',
        description: 'Stream from KissKH'
      },
      {
        url: 'https://example.com/stream2.mp4',
        name: 'AsiaView Stream - Medium Quality',
        description: 'Alternative stream from KissKH'
      }
    ];
  }

  static createMockEpisodeData() {
    return {
      episodes: [
        { href: '/episode/1', episodeNum: 1 },
        { href: '/episode/2', episodeNum: 2 },
        { href: '/episode/3', episodeNum: 3 }
      ]
    };
  }

  static async setupTestEnvironment() {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.TMDB_API_KEY = 'test-api-key';

    // Mock console methods to reduce test noise
    const originalConsole = { ...console };
    console.log = jest.fn();
    console.error = jest.fn();

    return {
      cleanup: () => {
        // Restore original console
        Object.assign(console, originalConsole);
        
        // Clean up environment
        delete process.env.NODE_ENV;
        delete process.env.TMDB_API_KEY;
      }
    };
  }

  static createMockResponse(data, status = 200) {
    return {
      status,
      data,
      headers: {},
      config: {}
    };
  }

  static createMockCheerioPage(html = '') {
    const cheerio = require('cheerio');
    return cheerio.load(html);
  }

  static generateTestIMDBIds() {
    return {
      movie: 'tt6751668', // Parasite
      series: 'tt4619332', // Squid Game
      koreanMovie: 'tt5127636', // Train to Busan
      unknown: 'tt0000000'
    };
  }

  static generateTestTitles() {
    return {
      movie: 'Parasite',
      series: 'Squid Game',
      withYear: 'Parasite (2019)',
      withSuffix: 'Movie Title - The Movie',
      empty: '',
      null: null
    };
  }

  static generateTestStreamRequests() {
    return [
      { type: 'movie', id: 'tt6751668' },
      { type: 'series', id: 'tt4619332' },
      { type: 'series', id: 'tt4619332:1:1' }, // Season 1 Episode 1
      { type: 'series', id: 'tt4619332:2:5' }, // Season 2 Episode 5
      { type: 'movie', id: 'tt0000000' }, // Unknown
      { type: 'movie', id: 'invalid' }, // Invalid
      { type: 'movie', id: null }, // Null
      { type: 'movie', id: undefined } // Undefined
    ];
  }

  static async waitForAsync(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static validateStreamStructure(stream) {
    const requiredProps = ['name', 'title', 'url', 'description'];
    const missing = requiredProps.filter(prop => !stream.hasOwnProperty(prop));
    
    return {
      isValid: missing.length === 0,
      missing,
      hasValidUrl: typeof stream.url === 'string' && stream.url.length > 0,
      hasValidName: typeof stream.name === 'string' && stream.name.length > 0
    };
  }

  static validateAddonResponse(response) {
    return {
      hasStreamsProperty: response.hasOwnProperty('streams'),
      streamsIsArray: Array.isArray(response.streams),
      hasValidStreams: response.streams.every(stream => 
        this.validateStreamStructure(stream).isValid
      )
    };
  }

  static createNetworkMock() {
    return {
      success: (data) => Promise.resolve(this.createMockResponse(data)),
      failure: (status = 500, message = 'Network Error') => {
        const error = new Error(message);
        error.response = { status };
        return Promise.reject(error);
      },
      timeout: () => Promise.reject(new Error('Request timeout'))
    };
  }
}

module.exports = TestUtils;