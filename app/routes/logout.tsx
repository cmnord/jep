import { redirect } from "react-router";

import type { Route } from "./+types/logout";

import { destroyAuthSession } from "~/models/auth";
import { assertIsPost } from "~/utils/http.server";

export function action({ request }: Route.ActionArgs) {
  assertIsPost(request);

  return destroyAuthSession(request);
}

export function loader() {
  throw redirect("/");
}
