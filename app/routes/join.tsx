import type { ActionArgs, V2_MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

import Button from "~/components/button";
import { ErrorMessage } from "~/components/error";
import Input from "~/components/input";
import { getRoom } from "~/models/room.server";

export const meta: V2_MetaFunction = () => [{ title: "jep! - Join game" }];

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const roomName = formData.get("roomName") as string;

  const room = await getRoom(roomName);
  if (!room) {
    return json({ error: `room "${roomName}" not found` }, { status: 404 });
  }

  throw redirect(`/room/${roomName}`);
}

export default function Join() {
  const data = useActionData<typeof action>();
  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md px-4 pt-8 md:pt-16">
        <h2 className="mb-4 text-2xl font-semibold">Join game</h2>
        <Form method="POST" className="flex flex-col gap-2">
          <label
            htmlFor="roomName"
            className="block text-sm font-medium text-gray-700"
          >
            Room name
          </label>
          <Input
            type="text"
            id="roomName"
            name="roomName"
            placeholder="e.g. 123-foo"
            required
          />
          <Button type="primary" htmlType="submit">
            Join game
          </Button>
          {data ? <ErrorMessage message={data.error} /> : null}
        </Form>
      </main>
    </div>
  );
}
