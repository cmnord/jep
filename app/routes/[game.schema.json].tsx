import { BASE_URL } from "~/utils";

/** SCHEMA is the JSON schema for *.jep.json files. */
const SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: BASE_URL + "/game.schema.json",
  additionalProperties: false,
  pattern: "^.*\\.jep\\.json$",
  title: "Jep! Game Schema",
  type: "object",
  properties: {
    title: {
      type: "string",
    },
    author: {
      type: "string",
    },
    copyright: {
      type: "string",
    },
    note: {
      type: "string",
    },
    boards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          categoryNames: {
            type: "array",
            items: {
              type: "string",
            },
          },
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                },
                note: {
                  type: "string",
                },
                clues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      clue: {
                        type: "string",
                      },
                      answer: {
                        type: "string",
                      },
                      value: {
                        type: "integer",
                      },
                      wagerable: {
                        type: "boolean",
                      },
                      longForm: {
                        type: "boolean",
                      },
                    },
                    required: ["clue", "answer", "value"],
                  },
                },
              },
              required: ["name", "clues"],
            },
          },
        },
        required: ["categoryNames", "categories"],
      },
    },
  },
  required: ["title", "author", "copyright", "note", "boards"],
};

export function loader() {
  const schemaStr = JSON.stringify(SCHEMA, null, 2);

  return new Response(schemaStr, {
    status: 200,
    headers: {
      "Content-Type": "application/schema+json",
    },
  });
}
