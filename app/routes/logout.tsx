import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { destroyAuthSession } from "~/models/auth";
import { assertIsPost } from "~/utils";

export function action({ request }: ActionArgs) {
  assertIsPost(request);

  return destroyAuthSession(request);
}

export function loader() {
  throw redirect("/");
}
