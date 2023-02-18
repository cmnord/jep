/*
 * @see https://www.npmjs.com/package/node-cache
 */
import NodeCache from "node-cache";
let cache: NodeCache;

declare global {
  var __cache: NodeCache | undefined;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new cache with every change either.
// in production we'll have a single cache.
if (process.env.NODE_ENV === "production") {
  cache = new NodeCache();
} else {
  if (!global.__cache) {
    global.__cache = new NodeCache();
  }
  cache = global.__cache;
}

export { cache };
