import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

let db: Database;

declare global {
  var __db__: Database;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new cache with every change either.
// in production we'll have a single cache.
if (process.env.NODE_ENV === "production") {
  db = initializeDatabase();
} else {
  if (!global.__db__) {
    global.__db__ = initializeDatabase();
  }
  db = global.__db__;
}

function initializeDatabase() {
  const {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID,
  } = process.env;

  const app = initializeApp({
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
    measurementId: FIREBASE_MEASUREMENT_ID,
  });

  return getDatabase(app);
}

export { db };
