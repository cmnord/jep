import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import classNames from "classnames";
import * as React from "react";

import Button from "~/components/button";
import {
  DefaultErrorBoundary,
  ErrorMessage,
  SuccessMessage,
} from "~/components/error";
import GameCard from "~/components/game-card";
import { QuestionMarkCircle } from "~/components/icons";
import Popover from "~/components/popover";
import Search from "~/components/search";
import Switch from "~/components/switch";
import Upload from "~/components/upload";

import { getAllGames } from "~/models/game.server";
import { getSessionFormState } from "~/session.server";
import { useDebounce } from "~/utils/use-debounce";

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const games = await getAllGames(search.get("q"));

  const solo = search.get("solo") === "on";

  const [formState, headers] = await getSessionFormState(request);

  return json({ games, formState, solo }, { headers });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const uploadFormRef = React.useRef<HTMLFormElement | null>(null);
  // The success and error messages are now shown even if JavaScript is not available.
  const [error, setError] = React.useState(data.formState.error);
  const [showSuccessMsg, setShowSuccessMsg] = React.useState(
    data.formState.success
  );
  const submit = useSubmit();
  const navigation = useNavigation();

  const [params] = useSearchParams();
  const searchFormRef = React.useRef<HTMLFormElement | null>(null);
  const initialSearch = params.get("q") ?? undefined;
  const [search, setSearch] = React.useState(initialSearch);
  const debouncedSearch = useDebounce(search, 500);

  const solo = params.get("solo") === "on";
  const [optimisticSolo, setOptimisticSolo] = React.useState(solo);

  React.useEffect(() => {
    setOptimisticSolo(solo);
  }, [solo]);

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
      uploadFormRef.current?.reset();
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

  React.useEffect(() => {
    if (debouncedSearch !== undefined) {
      submit(searchFormRef.current);
    }
  }, [debouncedSearch, submit]);

  return (
    <main className="max-w-screen-md px-4 pt-8 pb-16 md:pt-16 mx-auto w-full sm:w-auto">
      <h2 className="text-2xl font-semibold mb-4">Games</h2>
      <Form method="GET" ref={searchFormRef}>
        <Search
          name="q"
          onChange={(s) => setSearch(s)}
          defaultValue={initialSearch}
          loading={fetcher.state === "loading"}
        />
        <input type="hidden" name="solo" value={solo ? "on" : "off"} />
      </Form>
      <Form method="GET" className="flex flex-col sm:flex-row mb-4 gap-6">
        <Link to={"/mock"}>
          <Button htmlType="button">Play a mock game</Button>
        </Link>
        <input type="hidden" name="q" value={debouncedSearch} />
        <div className="inline-flex items-center gap-3">
          <Switch
            name="solo"
            checked={optimisticSolo}
            onClick={(checked) => setOptimisticSolo(checked)}
          />
          <div className="inline-flex gap-0.5">
            <p
              className={classNames("text-sm text-slate-500", {
                "font-bold": optimisticSolo,
              })}
            >
              Solo mode {optimisticSolo ? "on" : "off"}
            </p>
            <Popover content="In solo mode, no other players can join the game. If you refresh the page the game will reset.">
              <button>
                <QuestionMarkCircle
                  outlined
                  className={
                    "w-4 h-4 text-slate-400 rounded-md " +
                    "hover:text-slate-500 hover:bg-slate-100"
                  }
                />
              </button>
            </Popover>
          </div>
        </div>
      </Form>
      {data.games.length === 0 && (
        <p className="text-sm text-slate-500">
          No games found{search ? ` for search "${debouncedSearch}"` : ""}
        </p>
      )}
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 mb-4">
        {data.games.map((game, i) => (
          <GameCard key={`game-${i}`} game={game} solo={optimisticSolo} />
        ))}
      </div>
      <fetcher.Form
        method="POST"
        action="/upload"
        encType="multipart/form-data"
        ref={uploadFormRef}
        replace
      >
        <Upload
          loading={navigation.state === "submitting"}
          onChange={() => {
            submit(uploadFormRef.current);
          }}
        />
      </fetcher.Form>
      {error && <ErrorMessage error={new Error(error)} />}
      {showSuccessMsg && <SuccessMessage message={"File Uploaded"} />}
    </main>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
