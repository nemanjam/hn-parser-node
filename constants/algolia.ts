export const ALGOLIA = {
  threads: {
    threadsUrl: 'https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring',
    hasHiringRegex: /hiring/i,
  },
  thread: {
    // https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_42017580
    threadBaseUrl: 'https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_',
  },
  axios: {
    // axios instance
    timeout: 10 * 1000,
    // axios-rate-limit
    delayBetweenRequests: 2 * 1000,
  },
};
