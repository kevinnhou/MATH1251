import { randomUUID } from "node:crypto";
import { withSerwist } from "@serwist/turbopack";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	agentRules: false,
	compress: process.env.NODE_ENV === "production",
	env: { BUILD_REVISION: randomUUID() },
	reactStrictMode: true,
	async redirects() {
		return [
			{
				destination: "/core",
				permanent: true,
				source: "/graph",
			},
		];
	},
};

export default withMDX(withSerwist(config));
