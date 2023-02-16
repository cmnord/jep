import {
  ActionArgs,
  json,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useSubmit,
  useActionData,
} from "@remix-run/react";
import * as React from "react";

import { Anchor } from "~/components/link";
import Button from "~/components/button";
import { DefaultErrorBoundary, ErrorMessage } from "~/components/error";
import Upload from "~/components/upload";

import { getAllGames } from "~/models/game.server";
import { uploadHandler } from "~/models/file-upload-handler.server";

export async function loader() {
  const games = await getAllGames();

  return json({ games });
}

export async function action({ request }: ActionArgs) {
  let fileName: string | undefined;
  let errorMsg: string | undefined;

  try {
    const formData = await unstable_parseMultipartFormData(
      request,
      uploadHandler
    );
    // formData.get will return the type our upload handler returns.
    fileName = formData.get("upload")?.toString();
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMsg = error.message;
    }
  }

  return json({ errorMsg, fileName });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  const submit = useSubmit();
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const actionData = useActionData<typeof action>();

  return (
    <div className="p-12">
      <Anchor href="https://j-archive.com">J! Archive &rarr;</Anchor>
      <p className="mb-4">
        Visit the J! Archive home page itself to find episode dates.
      </p>
      <h2 className="text-2xl font-semibold mb-4">Games</h2>
      <div className="flex flex-col gap-4 items-start">
        <Button>
          <Link to={"/game/mock"}>Play a mock game</Link>
        </Button>
        <Form method="post" encType="multipart/form-data" ref={formRef}>
          <Upload onChange={() => submit(formRef.current)} />
        </Form>
        {actionData?.errorMsg ? (
          <ErrorMessage
            error={new Error("Error uploading file: " + actionData.errorMsg)}
          />
        ) : null}
        <div>
          {actionData?.fileName
            ? `File Uploaded: ${actionData?.fileName}`
            : null}
        </div>
      </div>
      <div>{JSON.stringify(data.games)}</div>
    </div>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
