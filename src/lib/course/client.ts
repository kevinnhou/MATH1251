"use client";

import { jsonResource } from "@/lib/client/resource";
import type { PageCatalog } from "./catalog";
import { catalogRoute } from "./urls";

export const catalogResource = jsonResource<PageCatalog>(catalogRoute);
