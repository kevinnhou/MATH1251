"use client";

import { jsonResource } from "@/lib/client/resource";
import { catalogRoute } from "@/lib/site/config";
import type { PageCatalog } from "./catalog";

export const catalogResource = jsonResource<PageCatalog>(catalogRoute);
