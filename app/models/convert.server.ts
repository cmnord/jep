import { z } from "zod";

/** IMAGE_DOMAIN_ALLOWLIST lists the domains that are allowed for image sources.
 * Some clues have images, and we want to make sure that the images are hosted
 * on a trusted domain. This is for security and to prevent abuse.
 *
 * Submit a GitHub issue to add a new domain to this list.
 */
export const IMAGE_DOMAIN_ALLOWLIST = [
  "www.j-archive.com",
  "upload.wikimedia.org",
];

function isValidImageSrc(src: string): boolean {
  try {
    const url = new URL(src);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (!IMAGE_DOMAIN_ALLOWLIST.includes(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export const ClueSchema = z
  .object({
    clue: z.string().trim().min(1, "clue must not be empty"),
    answer: z.string().trim().min(1, "answer must not be empty"),
    value: z.number(),
    imageSrc: z
      .string()
      .trim()
      .min(1, "imageSrc must not be empty; remove the field instead")
      .refine(
        isValidImageSrc,
        `imageSrc must be a valid HTTP(S) URL from [${IMAGE_DOMAIN_ALLOWLIST.join(", ")}]`,
      )
      .optional(),
    wagerable: z.boolean().optional(),
    longForm: z.boolean().optional(),
  })
  .refine((clue) => !clue.longForm || clue.wagerable, {
    message: "long-form clues must also be wagerable",
  });

export const CategorySchema = z.object({
  name: z.string().trim().min(1, "category name must not be empty"),
  clues: z.array(ClueSchema).min(1, "category must have at least one clue"),
  note: z.string().optional(),
});

export const BoardSchema = z
  .object({
    categoryNames: z
      .array(z.string())
      .min(1, "board must have at least one category name"),
    categories: z
      .array(CategorySchema)
      .min(1, "board must have at least one category"),
  })
  .refine((board) => board.categoryNames.length === board.categories.length, {
    message: "categoryNames and categories must have the same length",
  })
  .refine(
    (board) => new Set(board.categoryNames).size === board.categoryNames.length,
    { message: "categoryNames must not have duplicates" },
  )
  .refine(
    (board) =>
      board.categories.every((cat, j) => cat.name === board.categoryNames[j]),
    { message: "category names must match categoryNames at each index" },
  );

export const GameSchema = z.object({
  title: z.string().trim().min(1, "title must not be empty"),
  author: z.string().trim().min(1, "author must not be empty"),
  copyright: z.string(),
  note: z.string(),
  boards: z.array(BoardSchema).min(1, "game must have at least one board"),
});

export type Game = z.infer<typeof GameSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Clue = z.infer<typeof ClueSchema>;

export const Convert = {
  toGame(json: string): Game {
    return GameSchema.parse(JSON.parse(json));
  },

  gameToJson(value: Game): string {
    return JSON.stringify(value, null, 2);
  },
};
