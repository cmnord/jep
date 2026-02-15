import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { destroyAuthSession } from "~/models/auth";
import { assertIsPost } from "~/utils/http.server";

export function action({ request }: ActionFunctionArgs) {
  assertIsPost(request);

  return destroyAuthSession(request);
}

export function loader() {
  throw redirect("/");
}
