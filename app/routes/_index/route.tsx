import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import * as React from "react";

import {
  DefaultErrorBoundary,
  ErrorMessage,
  SuccessMessage,
} from "~/components/error";
import { LoadingSpinner } from "~/components/icons";
import Main from "~/components/main";
import Search from "~/components/search";
import Upload from "~/components/upload";
import { getValidAuthSession } from "~/models/auth";
import { getGames } from "~/models/game.server";
import { Solve, getSolvesForUser } from "~/models/solves.server";
import { getSessionFormState } from "~/session.server";
import useDebounce from "~/utils/use-debounce";
import useScrollToBottom from "~/utils/use-scroll";

import GameCard from "./game-card";

export async function loader({ request }: LoaderFunctionArgs) {
  const authSession = await getValidAuthSession(request);

  const searchParams = new URL(request.url).searchParams;
  const pageStr = searchParams.get("page");
  const page = pageStr ? Number(pageStr) : 1;

  const serverGames = await getGames(
    { page, search: searchParams.get("q") },
    authSession?.accessToken,
  );

  const userId = authSession?.userId;
  const solves = userId
    ? await getSolvesForUser(userId, authSession?.accessToken)
    : [];

  const [formState, headers] = await getSessionFormState(request);

  return json({ serverGames, formState, authSession, solves }, { headers });
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

  // Pagination
  const gameFetcher = useFetcher<typeof loader>();
  const [games, setGames] = React.useState(data.serverGames);
  // Start with two because 1 was pre-loaded
  const [page, setPage] = React.useState(2);
  const [shouldLoadMore, setShouldLoadMore] = React.useState(true);

  // solvesMap is a map from game_id to solve. Check against it to see if a game
  // has been solved.
  const solvesMap = new Map<string, Solve>();
  data.solves.forEach((solve) => {
    solvesMap.set(solve.game_id, solve);
  });

  useScrollToBottom(() => {
    if (!shouldLoadMore) return;
    const qParam = debouncedSearch ? `&q=${debouncedSearch}` : "";
    gameFetcher.load(`/?index${qParam}&page=${page}`);

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
      <Form method="GET" ref={searchFormRef}>
        <Search
          name="q"
          onChange={(s) => setSearch(s)}
          defaultValue={initialSearch}
          loading={navigation.state === "loading"}
        />
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
          <GameCard
            key={`game-${i}`}
            game={game}
            solve={solvesMap.get(game.id)}
          />
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
