import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function action({ request }: ActionArgs) {
  // TODO: log out user, then redirect to `/`
  return null;
}

export async function loader() {
  throw redirect("/");
}
