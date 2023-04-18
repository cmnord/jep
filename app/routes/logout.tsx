import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { destroyAuthSession } from "~/models/auth";
import { assertIsPost } from "~/utils";

export async function action({ request }: ActionArgs) {
  assertIsPost(request);

  return destroyAuthSession(request);
}

export async function loader() {
  throw redirect("/");
}
