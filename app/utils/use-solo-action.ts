import type { Fetcher } from "@remix-run/react";
import * as React from "react";

import type { Action } from "~/engine";

/** useSoloAction dispatches an action if we get data from the fetcher response.
 * This handles local play because only mock POST requests get an Action as a
 * response.
 */
export function useSoloAction(
  fetcher: Fetcher<Action>,
  dispatch: React.Dispatch<Action>,
  callback?: (action: Action) => void
) {
  React.useEffect(() => {
    const action = fetcher.data;
    if (action) {
      dispatch(action);
      callback && callback(action);
    }
  }, [fetcher.data, dispatch, callback]);
}
