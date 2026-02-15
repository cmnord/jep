import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect, unstable_parseMultipartFormData } from "@remix-run/node";

import { getValidAuthSession } from "~/models/auth";
import { flashFormState } from "~/session.server";
import { BASE_URL } from "~/utils";
import { getRedirectTo, safeRedirect } from "~/utils/http.server";

import { newUploadHandler } from "./file-upload-handler.server";

export function loader({ request }: LoaderFunctionArgs) {
  const redirectTo = getRedirectTo(request);
  return redirect(safeRedirect(redirectTo));
}

/** POST /game parses and uploads a new game to the server. */
export async function action({ request }: ActionFunctionArgs) {
  const authSession = await getValidAuthSession(request);
  const visibility = authSession !== null ? "UNLISTED" : "PUBLIC";
  const redirectTo = getRedirectTo(request);

  try {
    const uploadHandler = newUploadHandler(authSession, visibility);
    const formData = await unstable_parseMultipartFormData(
      request,
      uploadHandler,
    );
    // formData.get will return the type our upload handler returns.
    const gameKey = formData.get("upload")?.toString();

    if (!gameKey) {
      const formState = {
        success: false,
        message: "Error uploading game: no game key returned.",
      };
      const headers = await flashFormState(request, formState);
      return redirect(safeRedirect(redirectTo), { headers, status: 400 });
    }

    const gameUrl = BASE_URL + "/game/" + gameKey + "/play";
    const formState = {
      success: true,
      message:
        visibility === "PUBLIC"
          ? `Created new public game. You may now view your game on the home page.`
          : `Created new unlisted game. You may now visit the link ${gameUrl} to play the new game.`,
    };
    const headers = await flashFormState(request, formState);
    return redirect(safeRedirect(redirectTo), { headers });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const formState = {
        success: false,
        message: "Error uploading game: " + error.message,
      };
      const headers = await flashFormState(request, formState);
      return redirect(safeRedirect(redirectTo), { headers, status: 400 });
    }
    throw error;
  }
}
