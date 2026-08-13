import { GlobeAmericas } from "~/components/icons";
import Link, { Anchor } from "~/components/link";
import Main from "~/components/main";
import { GITHUB_URL } from "~/utils";
import { getPageMetadata, SITE_DESCRIPTION } from "~/utils/seo";

import type { Route } from "./+types/about";

const TITLE = "About Jep!";

export const meta: Route.MetaFunction = () =>
  getPageMetadata(TITLE, SITE_DESCRIPTION);

export default function About() {
  return (
    <div className="max-w-full grow">
      <Main>
        <div className="mb-4 flex items-center gap-3">
          <GlobeAmericas className="h-8 w-8" />
          <h1 className="text-2xl font-semibold">About Jep!</h1>
        </div>
        <p className="mb-4">{SITE_DESCRIPTION}</p>
        <p className="mb-4">
          The website is open to contributions from developers of any level or
          experience. For more information, to contribute, or to report an
          issue, visit the project on <Anchor href={GITHUB_URL}>GitHub</Anchor>.
        </p>
        <h2 className="mt-8 mb-3 text-xl font-semibold">Learn more</h2>
        <ul className="flex list-inside list-disc flex-col gap-2">
          <li>
            <Link to="/howto">Learn how to play</Link> and practice using the
            buzzer.
          </li>
          <li>
            <Link to="/upload-help">Learn how to upload a game</Link> using a
            Jep! JSON file.
          </li>
          <li>
            Read the <Link to="/community">community guidelines</Link> for
            sharing public games.
          </li>
        </ul>
      </Main>
    </div>
  );
}
