import * as U from "@core/unknownutil";

export function _ensureURL(url: string) {
  // return U.ensure(URL.parse(url), U.isInstanceOf(URL));
  return U.ensure(new URL(url), U.isInstanceOf(URL));
}
