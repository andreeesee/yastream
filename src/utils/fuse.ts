import Fuse, { FuseResult, IFuseOptions } from "fuse.js";
import { SearchResult } from "../source/kisskh.js";
import { Logger } from "./logger.js";

interface SearchItem {
  original: SearchResult;
  normalizedTitle: string;
}

/**
 * Loop through all search terms and find the best fit
 */
export function matchTitle(
  results: SearchResult[],
  title: string,
  year: number | null,
  season: number | null,
): SearchResult {
  const options: IFuseOptions<SearchItem> = {
    keys: ["normalizedTitle"],
    includeScore: true,
    threshold: 0.2, // 0 is perfect match, 1 is all
    isCaseSensitive: false,
    location: 0,
    ignoreLocation: false,
    ignoreFieldNorm: true,
    includeMatches: false,
    distance: 100,
    shouldSort: true,
    findAllMatches: false,
  };

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/(\d+)(st|nd|rd|th)/g, "$1") // fix 2nd season -> 2 season
      .replace(/[\u2018\u2019\u00b4\u201a]/g, "'") // fix quotes
      .replace(/[^a-z0-9\s']/g, " ") // only character, space and quote
      .replace(/\s+/g, " ") // no extra spaces
      .trim();
  };

  const searchList: SearchItem[] = results.map((originalItem) => ({
    original: originalItem,
    normalizedTitle: normalize(originalItem.title),
  }));
  const fuse = new Fuse(searchList, options);
  const searchTitles = [title];
  if (season) {
    searchTitles.push(
      ...[`${title} Season ${season}`, `${title} ${season} Season`],
    );
  }
  if (year) {
    searchTitles.push(`${title} ${year}`);
  }
  let result: FuseResult<SearchItem> | null = null;
  for (const query of searchTitles) {
    const searchResults = fuse.search(normalize(query));
    if (searchResults.length > 0) {
      const best = searchResults[0]!;
      if (!result || best.score?.toFixed(3)! <= result.score?.toFixed(3)!) {
        result = best;
      }
    }
  }

  if (result == null) {
    throw new Error(
      `FUSE filtered all results | ${title} ${year} Season ${season}`,
    );
  }

  new Logger("FUSE").log(
    `Match | ${result.item.original.title} : ${result.score?.toFixed(3)}`,
  );
  return result.item.original;
}
