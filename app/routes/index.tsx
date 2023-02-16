import { json, LoaderArgs } from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useSubmit,
  useFetcher,
  Form,
  useSearchParams,
} from "@remix-run/react";
import * as React from "react";

import Button from "~/components/button";
import {
  DefaultErrorBoundary,
  ErrorMessage,
  SuccessMessage,
} from "~/components/error";
import GameCard from "~/components/game-card";
import Search from "~/components/search";
import Upload from "~/components/upload";

import { getAllGames } from "~/models/game.server";
import { getSessionFormState } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const games = await getAllGames(search.get("q"));

  const [formState, headers] = await getSessionFormState(request);

  return json({ games, formState }, { headers });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const fetcher = useFetcher();
  const formRef = React.useRef<HTMLFormElement | null>(null);
  // The success and error messages are now shown even if JavaScript is not available.
  const [error, setError] = React.useState(data.formState.error);
  const [showSuccessMsg, setShowSuccessMsg] = React.useState(
    data.formState.success
  );

  const submit = useSubmit();

  React.useEffect(() => {
    if (fetcher.state === "submitting") {
      // JavaScript to clean messages when submitting
      setShowSuccessMsg(false);
      setError("");
    }
  }, [fetcher.state]);

  React.useEffect(() => {
    let timeout: number;
    if (data.formState.success) {
      // Use JavaScript to reset form
      formRef.current?.reset();
      setShowSuccessMsg(true);
      setError("");
      timeout = window.setTimeout(() => {
        // Use JavaScript to hide success message after timeout
        setShowSuccessMsg(false);
      }, 5000);
    } else if (data.formState.error) {
      setShowSuccessMsg(false);
      setError(data.formState.error);
    }
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [data]);

  return (
    <div className="p-12">
      <h2 className="text-2xl font-semibold mb-4">Games</h2>
      <Form method="get">
        <Search name="q" defaultValue={params.get("q") ?? undefined} />
      </Form>
      <div className="flex flex-col gap-4 items-start mb-4">
        <Button>
          <Link to={"/game/mock"}>Play a mock game</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4">
        {data.games.map((game, i) => (
          <GameCard key={`game-${i}`} game={game} />
        ))}
      </div>
      <fetcher.Form
        method="post"
        action="/upload"
        encType="multipart/form-data"
        ref={formRef}
        replace
      >
        <Upload onChange={() => submit(formRef.current)} />
      </fetcher.Form>
      {error && <ErrorMessage error={new Error(error)} />}
      {showSuccessMsg && <SuccessMessage message={"File Uploaded"} />}
    </div>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
