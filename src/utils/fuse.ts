import Fuse, { FuseResult, IFuseOptions } from "fuse.js";
import { SearchResult } from "../source/kisskh.js";
import { Logger } from "./logger.js";
import { extract, token_set_ratio } from "fuzzball";

interface SearchItem<T> {
  original: T;
  normalizedTitle: string;
}
interface BestMatch<T> {
  queryUsed: string;
  fuseResult: FuseResult<SearchItem<T>>;
}

const logger = new Logger("FUSE");

interface Search {
  title: string;
}
/**
 * Loop through all search terms and find the best fit
 */
export function matchTitle<T extends Search>(
  results: T[],
  title: string,
  year?: number,
  season?: number,
  altTitle?: string,
): T[] {
  const options: IFuseOptions<SearchItem<T>> = {
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

  const searchList: SearchItem<T>[] = results.map((originalItem) => ({
    original: originalItem,
    normalizedTitle: normalize(originalItem.title),
  }));
  const fuse = new Fuse(searchList, options);

  const searchTitles = createSearchList(title, season, year);
  if (altTitle) searchTitles.push(...createSearchList(altTitle, season, year));

  let best: BestMatch<T> | null = null;

  for (const query of searchTitles) {
    const normalizedQuery = normalize(query);
    const searchResults = fuse.search(normalizedQuery);
    if (searchResults.length === 0) continue;
    const candidate = searchResults[0]!;
    if (
      !best ||
      (candidate.score?.toFixed(3) ?? 1) <=
        (best.fuseResult.score?.toFixed(3) ?? 1)
    ) {
      best = { fuseResult: candidate, queryUsed: normalizedQuery };
    }
  }

  if (!best) {
    throw new Error(
      `FUSE filtered all results | ${title} ${year} Season ${season}`,
    );
  }
  const candidateTitle = best.fuseResult.item.normalizedTitle;
  const tokenScore = token_set_ratio(best.queryUsed, candidateTitle);
  const MIN_TOKEN_SCORE = 80;
  if (tokenScore < MIN_TOKEN_SCORE) {
    throw new Error(
      `Token-set score too low (${tokenScore}) | "${best.queryUsed}" -> "${candidateTitle}"`,
    );
  }
  logger.log(
    `Match | ${best.fuseResult.item.original.title}, Fuse ${best.fuseResult.score?.toFixed(3)}, Fuzz ${tokenScore}`,
  );

  return [best.fuseResult.item.original];
}

function createSearchList(title: string, season?: number, year?: number) {
  const searchTitles = [title];
  if (season) {
    searchTitles.push(
      ...[`${title} Season ${season}`, `${title} ${season} Season`],
    );
  }
  if (year) {
    searchTitles.push(`${title} ${year}`);
  }
  return searchTitles;
}

const normalize = (str: string) => {
  return str
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)/g, "$1") // fix 2nd season -> 2 season
    .replace(/[\u2018\u2019\u00b4\u201a]/g, "'") // fix quotes
    .replace(/[^a-z0-9\s']/g, " ") // only character, space and quote
    .replace(/\s+/g, " ") // no extra spaces
    .trim();
};

function tokenSetScore(a: string, b: string): number {
  const cleanA = normalize(a);
  const cleanB = normalize(b);
  return token_set_ratio(cleanA, cleanB); // 0–100
}
