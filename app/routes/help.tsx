import Code, { CodeBlock } from "~/components/code";

export default function Help() {
  return (
    <div className="p-12">
      <h2 className="text-2xl font-semibold mb-4">.jep.json file format</h2>
      <p className="mb-4">
        A <Code>.jep.json</Code> file has the following format:
      </p>
      <CodeBlock>
        {`{
  "title": "Your Title",
  "author": "Author Name",
  "version": "1.0.0", // version number in semver
  "copyright": "(c) Copyright Holder",
  "note": "any note",
  "boards": [ ... board objects ]
}`}
      </CodeBlock>
      <p className="mb-4">
        A game is a series of "boards". Each board looks like so:
      </p>
      <CodeBlock>
        {`{
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
      </CodeBlock>
      <p className="mb-4">In summary:</p>
      <CodeBlock>
        {`interface Game {
  title: string;
  author: string;
  version: string;
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
  isDailyDouble?: boolean;
}`}
      </CodeBlock>
    </div>
  );
}
