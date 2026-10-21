import type { EnvPack } from "@/lib/mdx-env/pack";

export interface StrandConfig {
	accent: string;
	id: string;
	label: string;
}

export interface CourseConfig {
	code: string;
	description: string;
	env: EnvPack;
	home: string;
	name: string;
	repo: { branch: string; name: string; owner: string };
	strands: readonly StrandConfig[];
	theme: { dark: string; light: string };
	title: string;
	tutor: string;
}
