import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	agentRules: false,
	compress: process.env.NODE_ENV === "production",
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

export default withMDX(config);
