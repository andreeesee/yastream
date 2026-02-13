import Fuse, { FuseResult, IFuseOptions } from "fuse.js";
import { SearchResult } from "../source/kisskh.js";
import { Logger } from "./logger.js";
/**
 * Loop through all search terms and find the best fit
 */
export function filterShow(
  results: SearchResult[],
  title: string,
  year: number | null,
  season: number | null,
): SearchResult {
  const options: IFuseOptions<SearchResult> = {
    keys: ["title"],
    includeScore: true,
    threshold: 0.2, // 0 is perfect match, 1 is all
    isCaseSensitive: false,
    location: 0,
    ignoreLocation: false,
    ignoreFieldNorm: true,
    includeMatches: false,
    distance: 4,
    shouldSort: true,
    findAllMatches: false,
  };

  const fuse = new Fuse(results, options);
  const searchTitles = [
    title,
    `${title} Season ${season}`,
    `${title} ${season} Season`,
    `${title} ${year}`,
    `${title} (${year})`,
  ];

  let result: FuseResult<SearchResult> | null = null;
  for (const query of searchTitles) {
    const searchResults = fuse.search(query.trim().toLowerCase());
    if (searchResults.length > 0) {
      const best = searchResults[0]!;
      if (!result || best.score?.toFixed(3)! <= result.score?.toFixed(3)!) {
        result = best;
      }
    }
  }

  if (result == null) {
    throw new Error("No search results found");
  }

  new Logger("FUSE").log(
    `Match | ${result.item.title} : ${result.score?.toFixed(3)}`,
  );
  return result.item;
}
