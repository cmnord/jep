import clsx from "clsx";
import * as React from "react";
import { Link, useMatches } from "react-router";

import Dialog from "~/components/dialog";
import { Anchor } from "~/components/link";
import { GITHUB_URL } from "~/utils";

/** Heroicon name: solid/globe-americas */
function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-8 w-8"
      role="img"
      aria-labelledby="globe-title"
    >
      <title id="globe-title">Globe</title>
      <path
        fillRule="evenodd"
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.262 6.072a8.25 8.25 0 1010.562-.766 4.5 4.5 0 01-1.318 1.357L14.25 7.5l.165.33a.809.809 0 01-1.086 1.085l-.604-.302a1.125 1.125 0 00-1.298.21l-.132.131c-.439.44-.439 1.152 0 1.591l.296.296c.256.257.622.374.98.314l1.17-.195c.323-.054.654.036.905.245l1.33 1.108c.32.267.46.694.358 1.1a8.7 8.7 0 01-2.288 4.04l-.723.724a1.125 1.125 0 01-1.298.21l-.153-.076a1.125 1.125 0 01-.622-1.006v-1.089c0-.298-.119-.585-.33-.796l-1.347-1.347a1.125 1.125 0 01-.21-1.298L9.75 12l-1.64-1.64a6 6 0 01-1.676-3.257l-.172-1.03z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LinkItem({
  isInGame,
  children,
}: {
  isInGame: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx("text-sm decoration-dashed hover:underline", {
        "text-slate-300 decoration-slate-300 hover:text-slate-100": isInGame,
        "text-slate-500 decoration-slate-500 hover:text-slate-700": !isInGame,
      })}
    >
      {children}
    </div>
  );
}

function Dot({ isInGame }: { isInGame: boolean }) {
  return (
    <div
      className={clsx({
        "text-slate-300": isInGame,
        "text-slate-500": !isInGame,
      })}
    >
      &middot;
    </div>
  );
}

export default function Footer() {
  const [showModal, setShowModal] = React.useState(false);
  const matches = useMatches();
  const isInGame = matches.some((match) => {
    const loaderData = match.loaderData;
    return loaderData && typeof loaderData === "object" && "game" in loaderData;
  });

  return (
    <footer
      className={clsx("flex justify-center py-4", {
        "bg-blue-1000": isInGame,
      })}
    >
      <Dialog
        isOpen={showModal}
        title={
          <div className="flex items-center gap-4">
            <GlobeIcon />
            <p>Jep!</p>
          </div>
        }
        description="Jep! is a website for playing trivia puzzles with friends online."
        onClickClose={() => setShowModal(false)}
      >
        <p className="text-slate-300">
          This website is open to contributions from developers of any level or
          experience. For more information or to report any issues, check out
          the project on <Anchor href={GITHUB_URL}>GitHub</Anchor>.
        </p>
      </Dialog>
      <div className="flex items-center gap-2">
        <button onClick={() => setShowModal(true)}>
          <LinkItem isInGame={isInGame}>About</LinkItem>
        </button>
        <Dot isInGame={isInGame} />
        <LinkItem isInGame={isInGame}>
          <Link to="howto">How to Play</Link>
        </LinkItem>
        <Dot isInGame={isInGame} />
        <LinkItem isInGame={isInGame}>
          <Link to="community">Community Guidelines</Link>
        </LinkItem>
      </div>
    </footer>
  );
}
