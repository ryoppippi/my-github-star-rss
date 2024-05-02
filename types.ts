import * as U from "@core/unknownutil";

export const isFeedEntry = U.isObjectOf({
  full_name: U.isString,
  html_url: U.isString,
  description: U.isUnionOf([U.isNullish, U.isString]),
  created_at: U.isString,
});

export type FeedEntry = U.PredicateType<typeof isFeedEntry>;
