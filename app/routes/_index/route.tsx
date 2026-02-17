import * as React from "react";
import {
  data,
  Form,
  useFetcher,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "react-router";

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
import { getSolvesForUser, Solve } from "~/models/solves.server";
import { getSessionFormState } from "~/session.server";
import useDebounce from "~/utils/use-debounce";
import useInfiniteScroll from "~/utils/use-scroll";

import type { Route } from "./+types/route";
import GameCard from "./game-card";

export async function loader({ request }: Route.LoaderArgs) {
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

  return data({ serverGames, formState, authSession, solves }, { headers });
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams();

  // Upload
  const uploadFetcher = useFetcher<never>();
  const uploadFormRef = React.useRef<HTMLFormElement | null>(null);
  // The success and error messages are shown even if JavaScript is not
  // available.
  const [formState, setFormState] = React.useState(loaderData.formState);

  // Search
  const searchFormRef = React.useRef<HTMLFormElement | null>(null);
  const initialSearch = params.get("q") ?? undefined;
  const [search, setSearch] = React.useState(initialSearch);
  const debouncedSearch = useDebounce(search, 500);
  const submit = useSubmit();
  const navigation = useNavigation();

  // Pagination
  const {
    items: games,
    sentinelRef,
    shouldLoadMore,
    isLoading: isLoadingMore,
  } = useInfiniteScroll(loaderData.serverGames, {
    getUrl: (page) => {
      const qParam = debouncedSearch ? `&q=${debouncedSearch}` : "";
      return `/?index${qParam}&page=${page}`;
    },
    getItems: (data: typeof loaderData) => data.serverGames,
  });

  // solvesMap is a map from game_id to solve. Check against it to see if a game
  // has been solved.
  const solvesMap = new Map<string, Solve>();
  loaderData.solves.forEach((solve) => {
    solvesMap.set(solve.game_id, solve);
  });

  React.useEffect(() => {
    if (uploadFetcher.state === "submitting") {
      // JavaScript to clean messages when submitting
      setFormState(undefined);
    }
  }, [uploadFetcher.state]);

  const loaderFormState = loaderData.formState;
  React.useEffect(() => {
    setFormState(loaderFormState);

    if (loaderFormState?.success) {
      // Use JavaScript to reset form
      uploadFormRef.current?.reset();
      const handler = window.setTimeout(() => {
        // Use JavaScript to hide success message after timeout
        setFormState(undefined);
      }, 10_000);
      return () => window.clearTimeout(handler);
    }
  }, [loaderFormState]);

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
        loggedIn={loaderData.authSession !== null}
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
      {shouldLoadMore && <div ref={sentinelRef} />}
      {isLoadingMore && (
        <div className="flex h-5 justify-center">
          <LoadingSpinner />
        </div>
      )}
    </Main>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
