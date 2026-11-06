import { randomUUID } from "node:crypto";
import { withSerwist } from "@serwist/turbopack";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const config: NextConfig = {
	agentRules: false,
	compress: process.env.NODE_ENV === "production",
	env: { BUILD_REVISION: randomUUID() },
	reactStrictMode: true,
};

export default withMDX(withSerwist(config));
