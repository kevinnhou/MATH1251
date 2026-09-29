"use client";

import { jsonResource } from "@/lib/client/resource";
import { graphDataRoute } from "@/lib/site/config";
import type { GraphDocument } from "./types";

export const graphResource = jsonResource<GraphDocument>(graphDataRoute);
