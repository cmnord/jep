import * as React from "react";
import type { Fetcher } from "react-router";

import type { Action } from "~/engine";

/** useSoloAction dispatches an action if we get data from the fetcher response.
 * This handles local play because only solo POST requests get an Action as a
 * response.
 */
export default function useSoloAction(
  fetcher: Fetcher<Action>,
  dispatch: React.Dispatch<Action>,
) {
  React.useEffect(() => {
    const action = fetcher.data;
    if (action) {
      dispatch(action);
    }
  }, [fetcher.data, dispatch]);
}
