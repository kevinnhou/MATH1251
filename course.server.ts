import diagrams from "@kevinnhou/domain-diagrams/server";
import math from "@kevinnhou/domain-math/server";
import type { DomainServer } from "engine";

export default [math, diagrams] satisfies DomainServer[];
