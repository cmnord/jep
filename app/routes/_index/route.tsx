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
import Dialog from "~/components/dialog";
import {
  DefaultErrorBoundary,
  ErrorMessage,
  SuccessMessage,
} from "~/components/error";
import { QuestionMarkCircle } from "~/components/icons";
import Popover from "~/components/popover";
import Search from "~/components/search";
import Switch from "~/components/switch";
import { getValidAuthSession } from "~/models/auth";
import { getAllGames } from "~/models/game.server";
import { getSessionFormState } from "~/session.server";
import { useDebounce } from "~/utils/use-debounce";

import GameCard from "./game-card";
import Upload from "./upload";

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);

  const authSession = await getValidAuthSession(request);
  const games = await getAllGames(search.get("q"), authSession?.accessToken);

  const solo = search.get("solo") === "on";

  const [formState, headers] = await getSessionFormState(request);

  return json({ games, formState, solo, authSession }, { headers });
}

/** Heroicon name: solid/exclamation-triangle */
function WarnIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-8 w-8"
      role="img"
      aria-labelledby="warn-title"
    >
      <title id="warn-title">Warning</title>
      <path
        fillRule="evenodd"
        d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Upload
  const uploadFormRef = React.useRef<HTMLFormElement | null>(null);
  // The success and error messages are shown even if JavaScript is not
  // available.
  const [formState, setFormState] = React.useState(data.formState);
  const submit = useSubmit();
  const navigation = useNavigation();
  const [showModal, setShowModal] = React.useState(false);
  const [file, setFile] = React.useState<File | undefined>();

  // Search
  const [params] = useSearchParams();
  const searchFormRef = React.useRef<HTMLFormElement | null>(null);
  const initialSearch = params.get("q") ?? undefined;
  const [search, setSearch] = React.useState(initialSearch);
  const debouncedSearch = useDebounce(search, 500);

  // Solo toggle
  const solo = params.get("solo") === "on";
  const [optimisticSolo, setOptimisticSolo] = React.useState(solo);

  React.useEffect(() => {
    setOptimisticSolo(solo);
  }, [solo]);

  React.useEffect(() => {
    if (fetcher.state === "submitting") {
      // JavaScript to clean messages when submitting
      setFormState(undefined);
    }
  }, [fetcher.state]);

  React.useEffect(() => {
    setFormState(data.formState);

    if (data.formState?.success) {
      // Use JavaScript to reset form
      uploadFormRef.current?.reset();
      const handler = window.setTimeout(() => {
        // Use JavaScript to hide success message after timeout
        setFormState(undefined);
      }, 10_000);
      return () => window.clearTimeout(handler);
    }
  }, [data.formState]);

  React.useEffect(() => {
    if (debouncedSearch !== undefined) {
      submit(searchFormRef.current);
    }
  }, [debouncedSearch, submit]);

  function handleChangeUpload(newFile?: File) {
    if (data.authSession) {
      submit(uploadFormRef.current);
      return;
    }
    setShowModal(true);
    setFile(newFile);
  }

  return (
    <main className="mx-auto w-full max-w-screen-md grow px-4 pb-16 pt-8 sm:w-auto md:pt-16">
      <h2 className="mb-4 text-2xl font-semibold">Games</h2>
      <Form method="GET" ref={searchFormRef}>
        <Search
          name="q"
          onChange={(s) => setSearch(s)}
          defaultValue={initialSearch}
          loading={fetcher.state === "loading"}
        />
        <input type="hidden" name="solo" value={solo ? "on" : "off"} />
      </Form>
      <Form method="GET" className="mb-4 flex flex-col gap-6 sm:flex-row">
        <Link to="/join">
          <Button htmlType="button">Join an existing game</Button>
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
                  className={`h-4 w-4 rounded-md text-slate-400
                  hover:bg-slate-100 hover:text-slate-500`}
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
      <div className="mb-4 flex flex-col gap-4 sm:grid sm:grid-cols-2">
        {data.games.map((game, i) => (
          <GameCard key={`game-${i}`} game={game} solo={optimisticSolo} />
        ))}
      </div>
      <fetcher.Form
        method="POST"
        action="/game"
        encType="multipart/form-data"
        ref={uploadFormRef}
        replace
      >
        <Dialog
          isOpen={showModal}
          title={
            <div className="flex items-center gap-4">
              <WarnIcon />
              <p>Confirm public upload</p>
            </div>
          }
          onClickClose={() => setShowModal(false)}
          description={`Do you want to upload the game "${
            file?.name ?? "unknown"
          }" publicly?`}
        >
          <p className="mb-2 text-slate-500">
            Log in to upload private games, edit games, or delete games.
          </p>
          <p className="mb-4 rounded-md bg-yellow-100 p-2 italic text-yellow-700">
            As a guest, you will not be able to edit or delete the game later.
          </p>
          <Dialog.Footer>
            <Button
              onClick={() => {
                submit(uploadFormRef.current);
                setShowModal(false);
              }}
            >
              Upload publicly
            </Button>
            <Link to="/login">
              <Button type="primary" htmlType="button" autoFocus>
                Log in
              </Button>
            </Link>
          </Dialog.Footer>
        </Dialog>
        <Upload
          loading={navigation.state === "submitting"}
          onChange={handleChangeUpload}
        />
      </fetcher.Form>
      {formState ? (
        formState.success ? (
          <SuccessMessage message={formState.message} />
        ) : (
          <ErrorMessage message={formState.message} />
        )
      ) : null}
    </main>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
