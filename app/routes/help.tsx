import type { MetaFunction } from "@remix-run/node";
import Code, { CodeBlock } from "~/components/code";

export const meta: MetaFunction = () => ({
  title: "jep! - Help",
});

export default function Help() {
  return (
    <div className="max-w-full">
      <main className="max-w-screen-md px-4 pt-8 pb-16 md:pt-16 mx-auto">
        <h2 className="text-2xl font-semibold mb-4">.jep.json file format</h2>
        <p className="mb-4">
          A <Code>.jep.json</Code> file has the following format:
        </p>
        <CodeBlock
          text={`{
  "title": "Your Title",
  "author": "Author Name",
  "copyright": "(c) Copyright Holder",
  "note": "any note",
  "boards": [ ... board objects ]
}`}
        />
        <p className="mb-4">
          A game is a series of "boards". Each board looks like so:
        </p>

        <CodeBlock
          text={`{
  "categoryNames": [
    "Category #1",
    "Category #2"
  ],
  "categories": [
    {
      "name": "Category #1",
      "clues": [
        {
          "clue": "The leaf of a fern is often referred to as this",
          "answer": "Frond",
          "value": 200
        }
        // ... more clues
      ]
    },
    {
      "name": "Category #2",
      "clues": [ ... clues for category 2 ],
    }
  ]
}`}
        />
        <p className="mb-4">
          A clue can be <span className="italic">wagerable</span> or not. The
          "wagerable" field is not required.
          <br />
          In summary:
        </p>
        <CodeBlock
          text={`interface Game {
  title: string;
  author: string;
  copyright: string;
  note: string;
  boards: Board[];
}

interface Board {
  categoryNames: string[];
  categories: Category[];
}

interface Category {
  name: string;
  clues: Clue[];
}

interface Clue {
  clue: string;
  answer: string;
  value: number;
  wagerable?: boolean; // default false
}`}
        />
      </main>
    </div>
  );
}
