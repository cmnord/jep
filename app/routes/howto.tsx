import type { V2_MetaFunction } from "@remix-run/node";

import HowToPlay from "~/components/how-to-play";

export const meta: V2_MetaFunction = () => [{ title: "Jep! - How to Play" }];

export default function HowTo() {
  return (
    <div className="max-w-full grow">
      <main className="mx-auto max-w-screen-md px-4 pt-8 md:pt-16">
        <HowToPlay />
      </main>
    </div>
  );
}
