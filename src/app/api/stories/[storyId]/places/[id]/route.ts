import { places } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";
import { deleteImagesFor } from "@/db/images";
import { placeUpdate } from "@/lib/entitySchemas";

const repo = createStoryScopedRepo(places);
export const { PATCH, DELETE } = itemHandlers(repo, placeUpdate, "id", { afterDelete: (id) => deleteImagesFor("place", id) });
