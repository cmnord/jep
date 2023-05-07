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

import {
  DefaultErrorBoundary,
  ErrorMessage,
  SuccessMessage,
} from "~/components/error";
import { LoadingSpinner, QuestionMarkCircle } from "~/components/icons";
import StyledLink from "~/components/link";
import Main from "~/components/main";
import Popover from "~/components/popover";
import Search from "~/components/search";
import Switch from "~/components/switch";
import Upload from "~/components/upload";
import { getValidAuthSession } from "~/models/auth";
import { getGames } from "~/models/game.server";
import { getSessionFormState } from "~/session.server";
import useDebounce from "~/utils/use-debounce";
import useScrollToBottom from "~/utils/use-scroll";

import GameCard from "./game-card";

export async function loader({ request }: LoaderArgs) {
  const authSession = await getValidAuthSession(request);

  const searchParams = new URL(request.url).searchParams;
  const pageStr = searchParams.get("page");
  const page = pageStr ? Number(pageStr) : 1;

  const serverGames = await getGames(
    { page, search: searchParams.get("q") },
    authSession?.accessToken
  );

  const [formState, headers] = await getSessionFormState(request);

  return json({ serverGames, formState, authSession }, { headers });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const [params] = useSearchParams();

  // Upload
  const uploadFetcher = useFetcher<never>();
  const uploadFormRef = React.useRef<HTMLFormElement | null>(null);
  // The success and error messages are shown even if JavaScript is not
  // available.
  const [formState, setFormState] = React.useState(data.formState);

  // Search
  const searchFormRef = React.useRef<HTMLFormElement | null>(null);
  const initialSearch = params.get("q") ?? undefined;
  const [search, setSearch] = React.useState(initialSearch);
  const debouncedSearch = useDebounce(search, 500);
  const submit = useSubmit();
  const navigation = useNavigation();

  // Solo toggle
  const solo = params.get("solo") === "on";
  const [optimisticSolo, setOptimisticSolo] = React.useState(solo);

  // Pagination
  const gameFetcher = useFetcher<typeof loader>();
  const [games, setGames] = React.useState(data.serverGames);
  // Start with two because 1 was pre-loaded
  const [page, setPage] = React.useState(2);
  const [shouldLoadMore, setShouldLoadMore] = React.useState(true);

  useScrollToBottom(() => {
    if (!shouldLoadMore) return;
    const qParam = debouncedSearch ? `&q=${debouncedSearch}` : "";
    const soloParam = optimisticSolo ? "&solo=on" : "";
    gameFetcher.load(`/?index${qParam}&page=${page}${soloParam}`);

    setShouldLoadMore(false);
  });

  React.useEffect(() => {
    if (!gameFetcher.data) {
      return;
    }
    const newGames = gameFetcher.data.serverGames;
    if (newGames.length === 0) {
      setShouldLoadMore(false);
      return;
    }

    setGames((prevGames) => [...prevGames, ...newGames]);
    setPage((prevPage) => prevPage + 1);
    setShouldLoadMore(true);
  }, [gameFetcher.data]);

  // Reset the games and page when the data from the server changes
  React.useEffect(() => {
    setGames(data.serverGames);
    setPage(2);
    setShouldLoadMore(true);
  }, [data.serverGames]);

  React.useEffect(() => {
    setOptimisticSolo(solo);
  }, [solo]);

  React.useEffect(() => {
    if (uploadFetcher.state === "submitting") {
      // JavaScript to clean messages when submitting
      setFormState(undefined);
    }
  }, [uploadFetcher.state]);

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

  return (
    <Main className="grow">
      <h1 className="mb-4 text-2xl font-semibold">Games</h1>
      <Form method="GET" ref={searchFormRef}>
        <Search
          name="q"
          onChange={(s) => setSearch(s)}
          defaultValue={initialSearch}
          loading={navigation.state === "loading"}
        />
        <div className="mb-4 flex flex-col gap-6 sm:flex-row">
          <Link to="/join">
            <Button htmlType="button">Join an existing game</Button>
          </Link>
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
                    className={`h-4 w-4 rounded-md text-slate-400
                  hover:bg-slate-100 hover:text-slate-500`}
                  />
                </button>
              </Popover>
            </div>
          </div>
        </div>
      </Form>
      <Upload
        fetcher={uploadFetcher}
        formRef={uploadFormRef}
        loggedIn={data.authSession !== null}
        redirectTo="/"
      />
      {formState ? (
        formState.success ? (
          <SuccessMessage>{formState.message}</SuccessMessage>
        ) : (
          <ErrorMessage>{formState.message}</ErrorMessage>
        )
      ) : null}
      {games.length === 0 && (
        <p className="text-sm text-slate-500">
          No games found{search ? ` for search "${debouncedSearch}"` : ""}
        </p>
      )}
      <div className="mb-4 flex flex-col gap-4 sm:grid sm:grid-cols-2">
        {games.map((game, i) => (
          <GameCard key={`game-${i}`} game={game} solo={optimisticSolo} />
        ))}
      </div>
      {gameFetcher.state === "loading" && (
        <div className="flex h-5 justify-center">
          <LoadingSpinner />
        </div>
      )}
    </Main>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
