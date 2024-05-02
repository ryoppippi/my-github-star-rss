import * as U from "@core/unknownutil";

export function _ensureURL(url: string) {
  // TODO: not work in deno deploy
  // return U.ensure(URL.parse(url), U.isInstanceOf(URL));

  if (!URL.canParse(url)) {
    throw new Error("Invalid URL");
  }

  return U.ensure(new URL(url), U.isInstanceOf(URL));
}
