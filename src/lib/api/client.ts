import createClient from "openapi-fetch";
import type { paths } from "./schema.gen";

export const apiClient = createClient<paths>({
  baseUrl:"http://localhost:8080"
});
