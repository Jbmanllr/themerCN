// The editor rewrites every design token on the page, so it may run only in
// `next dev` with the host's own flag: a production or preview runtime, or
// another host's flag, must keep it off.

import { expect, it } from "vitest";

import { isThemerOn } from "./flag";

it("is on only in development with this host's flag set to 1", () => {
  const flag = "BANTER_CMS_THEMER";
  expect(isThemerOn(flag, { NODE_ENV: "development", [flag]: "1" })).toBe(true);
  expect(isThemerOn(flag, { NODE_ENV: "production", [flag]: "1" })).toBe(false);
  expect(isThemerOn(flag, { NODE_ENV: "development", [flag]: "true" })).toBe(
    false,
  );
  expect(
    isThemerOn(flag, { NODE_ENV: "development", BANTER_WEB_THEMER: "1" }),
  ).toBe(false);
});
