const KissKHScraperr = require("./kisskh");
describe("KissKH Scraper Tests", () => {
  let scraper;

  beforeEach(() => {
    scraper = new KissKHScraperr();
  });

  describe("Get correct streams", () => {
    test("Get correct links", async () => {
      scraper
        .searchContent("Single's Inferno", "series")
        .expect(scraper.baseUrl)
        .toBe("https://kisskh.fan");
      expect(scraper.contentDomain).toBe("https://kisskh.me.in");
    });
  });
});
