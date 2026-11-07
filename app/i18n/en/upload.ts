/** English messages: upload (upload box, upload results and errors).
 * Keys start with "upload.". */
export const upload = {
  "upload.uploadOrImport": "Upload or import a game",
  "upload.invalidFileType": "Invalid file type",
  "upload.dropFileHere": "Drop file here",
  "upload.hint": "Jep! game (.jep.json) or SIGame pack (.siq, up to 100 MB)",
  "upload.help": "Upload help",
  "upload.confirmPublic": "Confirm public upload",
  "upload.confirmPublicDescription":
    'Do you want to upload the game "{name}" publicly?',
  "upload.unknownFile": "unknown",
  "upload.guestWarning":
    "As a guest, you will not be able to edit or delete the game later.",
  "upload.cancel": "Cancel",
  "upload.guidelines":
    "Games must follow the <link>community guidelines</link>.",
  "upload.uploadPublicly": "Upload publicly",
  "upload.importingSiq": "Importing SIGame pack…",
  "upload.uploading": "Uploading…",
  "upload.createdPublic":
    "Created new public game. You may now view your game on the home page.",
  "upload.createdUnlisted":
    "Created new unlisted game. You may now visit the link {url} to play the new game.",
  "upload.error.prefix": "Error uploading game: {reason}",
  "upload.error.noGameKey": "no game key returned.",
  "upload.error.tooLarge":
    "the file is too large (SIGame packs: at most 100 MB, JSON games: at most 1 MB).",
  "upload.error.unsupported":
    "Unsupported file. Upload a Jep! game (.jep.json) or a SIGame pack (.siq).",
  "upload.error.jsonTooLarge": "JSON games must be at most 1 MB.",
  "upload.progress.importingTitle": "Importing the pack…",
  "upload.progress.savingTitle": "Saving the game…",
  "upload.progress.uploadingHint": "Please keep this page open.",
  "upload.progress.importingHint":
    "Processing media files — large packs can take a minute. Please keep this page open.",
  "upload.progress.savingHint": "Almost done.",
  "upload.progress.bytes": "{loaded} of {total}",
  "upload.progress.barLabel": "Upload progress",
  "upload.progress.processingLabel": "Processing on the server",
  "upload.progress.cancel": "Cancel upload",
  "upload.progress.announceUploading": "Uploading {name}…",
  "upload.progress.announceImporting": "Upload complete. Importing the pack…",
  "upload.progress.announceSaving": "Upload complete. Saving the game…",
  "upload.progress.announceCanceled": "Upload canceled.",
  "upload.retry": "Try again",
  "upload.error.network":
    "Error uploading game: the connection was lost. Check your internet connection and try again.",
  "upload.error.server":
    "Error uploading game: the server answered with error {status}. Please try again later.",
} as const;
