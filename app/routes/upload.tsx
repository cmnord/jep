import {
  ActionArgs,
  redirect,
  unstable_parseMultipartFormData,
} from "@remix-run/node";

import { uploadHandler } from "~/file-upload-handler.server";
import { flashFormState } from "~/session.server";

export async function action({ request }: ActionArgs) {
  try {
    const formData = await unstable_parseMultipartFormData(
      request,
      uploadHandler
    );
    // formData.get will return the type our upload handler returns.
    const gameKey = formData.get("upload")?.toString();
    const formState = {
      success: true,
      error: `Created game with key ${gameKey}`,
    };
    const headers = await flashFormState(request, formState);
    return redirect("/", { headers });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const formState = {
        success: false,
        error: "Error uploading game: " + error.message,
      };
      const headers = await flashFormState(request, formState);
      return redirect("/", { headers });
    }

    const formState = { success: false, error: "Error uploading game" };
    const headers = await flashFormState(request, formState);
    return redirect("/", { headers });
  }
}
