import { places } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";
import { placeCreate } from "@/lib/entitySchemas";

const repo = createStoryScopedRepo(places);
export const { GET, POST } = listCreateHandlers(repo, placeCreate);
