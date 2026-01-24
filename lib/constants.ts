export const RESULTS_PER_PAGE = 50;
export const MAX_QUERY_LENGTH = 200;
export const MAX_PAGE = 100;
export const MAX_TOKENS = 20;

export const EXAMPLE_QUERIES: [string, string][] = [
  ['hello', 'English word'],
  ['nihao', 'Pinyin without tones'],
  ['ni3hao3', 'Pinyin with tone numbers'],
  ['chinese *文', 'Wildcard search'],
  ['"to use"', 'Exact phrase'],
  ['apple -phone', 'Exclude term'],
];
