import {
  MaxFileSizeExceededError,
  parseFormData,
} from "@mjackson/form-data-parser";
import { redirect } from "react-router";
import { ENV } from "varlock/env";

import { createT } from "~/i18n";
import { getRequestLocale } from "~/i18n/resolve";
import { getValidAuthSession } from "~/models/auth";
import { SiqImportError } from "~/models/siq/errors";
import { formatSiqSummary } from "~/models/siq/summary";
import { flashFormState } from "~/session.server";
import { getRedirectTo, safeRedirect } from "~/utils/http.server";
import {
  UPLOAD_PROGRESS_HEADER,
  type UploadResult,
} from "~/utils/upload-with-progress";

import type { Route } from "./+types/route";
import { MAX_SIQ_SIZE, newUploadHandler } from "./file-upload-handler.server";

export function loader({ request }: Route.LoaderArgs) {
  const redirectTo = getRedirectTo(request);
  return redirect(safeRedirect(redirectTo));
}

/** POST /game parses and uploads a new game to the server. */
export async function action({ request }: Route.ActionArgs) {
  const authSession = await getValidAuthSession(request);
  const visibility = authSession !== null ? "UNLISTED" : "PUBLIC";
  const redirectTo = getRedirectTo(request);
  const locale = getRequestLocale(request);
  const t = createT(locale);
  const uploadError = (reason: string) => ({
    success: false,
    message: t("upload.error.prefix", { reason }),
  });
  // The upload box posts with an XMLHttpRequest to show progress; it gets
  // JSON (with the same flash cookie) and navigates itself, because the
  // request would follow a redirect and consume the flash message.
  const progressUpload = request.headers.get(UPLOAD_PROGRESS_HEADER) === "1";
  const finish = async (
    formState: Parameters<typeof flashFormState>[1],
    status?: number,
  ) => {
    const headers = await flashFormState(request, formState);
    const to = safeRedirect(redirectTo);
    if (progressUpload) {
      const result: UploadResult = { redirectTo: to };
      return Response.json(result, { headers, status: status ?? 200 });
    }
    return redirect(to, status ? { headers, status } : { headers });
  };

  try {
    const uploadHandler = newUploadHandler(authSession, visibility, locale);
    const formData = await parseFormData(
      request,
      {
        // The SIGame pack limit; JSON games are limited to 1 MB by the
        // upload handler.
        maxFileSize: MAX_SIQ_SIZE,
        maxFiles: 1,
      },
      uploadHandler,
    );
    // formData.get will return the type our upload handler returns.
    const gameKey = formData.get("upload")?.toString();

    if (!gameKey) {
      const formState = uploadError(t("upload.error.noGameKey"));
      return finish(formState, 400);
    }

    const gameUrl = ENV.BASE_URL + "/game/" + gameKey + "/play";
    const created =
      visibility === "PUBLIC"
        ? t("upload.createdPublic")
        : t("upload.createdUnlisted", { url: gameUrl });
    const siqSummary = uploadHandler.siqSummary();
    const imported = siqSummary
      ? formatSiqSummary(siqSummary, locale)
      : undefined;
    const formState = {
      success: true,
      message: imported ? `${imported.message} ${created}` : created,
      ...(imported && imported.details.length > 0
        ? { details: imported.details }
        : {}),
    };
    return finish(formState);
  } catch (error: unknown) {
    if (error instanceof MaxFileSizeExceededError) {
      const formState = uploadError(t("upload.error.tooLarge"));
      return finish(formState, 400);
    }
    if (error instanceof SiqImportError) {
      const formState = uploadError(error.localize(locale));
      return finish(formState, 400);
    }
    if (error instanceof Error) {
      // Other messages (JSON syntax and schema problems, database errors)
      // are technical and stay in English.
      const formState = uploadError(error.message);
      return finish(formState, 400);
    }
    throw error;
  }
}
