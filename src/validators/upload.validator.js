import { z } from "zod";
import { optionalString } from "./common.js";

export const uploadBodySchema = z.object({
  folder: optionalString(255).refine(
    (folder) => folder === undefined || /^[\w\-/]+$/.test(folder),
    "Folder may only contain letters, numbers, '-', '_' and '/'."
  ),
});
