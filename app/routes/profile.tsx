import { json } from "@remix-run/node";

export async function loader() {
  // TODO: if not logged in, redirect to `/login`
  return json({ user: null }, { status: 500 });
}

export default function Profile() {
  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md px-4 pb-16 pt-8 md:pt-16">
        <h2 className="mb-4 text-2xl font-semibold">Profile</h2>
      </main>
    </div>
  );
}
