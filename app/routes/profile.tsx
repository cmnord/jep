import type { LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { requireAuthSession } from "~/models/auth";
import { getUserByEmail } from "~/models/user/service.server";

export async function loader({ request }: LoaderArgs) {
  const authSession = await requireAuthSession(request);

  if (!authSession) {
    throw redirect("/login");
  }

  const user = await getUserByEmail(authSession.email);
  return json({ user });
}

export default function Profile() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md px-4 pb-16 pt-8 md:pt-16">
        <h2 className="mb-4 text-2xl font-semibold">Profile</h2>
        <p>{user?.email}</p>
      </main>
    </div>
  );
}
