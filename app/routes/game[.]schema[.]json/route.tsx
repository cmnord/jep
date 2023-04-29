import { SCHEMA } from "./schema";

export async function loader() {
  const schema = JSON.stringify(SCHEMA);

  return new Response(schema, {
    status: 200,
    headers: {
      "Content-Type": "application/schema+json",
    },
  });
}
