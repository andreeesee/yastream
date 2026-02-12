const TMDBService = require("./tmdb");

describe("TMDB Service Tests", () => {
  let tmdbService;

  beforeEach(() => {
    tmdbService = new TMDBService();
  });

  describe("Constructor", () => {
    test("", () => {
      const originalEnv = process.env.TMDB_API_KEY;
      process.env.TMDB_API_KEY = "test-key";

      const service = new TMDBService();
      expect(service.apiKey).toBe("test-key");

      process.env.TMDB_API_KEY = originalEnv;
    });
  });
});
