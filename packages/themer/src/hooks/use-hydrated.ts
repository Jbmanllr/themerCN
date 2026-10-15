// The one hydration gate. False on the server and during hydration, true
// after: markup that may only exist on the client renders on the pass after
// hydration, so the hydrated tree matches the server HTML. `<Themer>` gates
// everything under it with it; `<ThemerHeadScript>` switches its script to a
// data block with it.

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** True once the client has hydrated; false on the server and while hydrating. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, onClient, onServer);
}
