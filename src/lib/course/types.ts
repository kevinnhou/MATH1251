import type { Domain } from "@/lib/mdx-env/component";

export interface StrandConfig {
	accent: string;
	id: string;
	label: string;
}

export type Schedule = "parallel" | "sequential";

export interface CourseConfig {
	code: string;
	description: string;
	domains: readonly Domain[];
	home: string;
	name: string;
	repo: { branch: string; name: string; owner: string };
	schedule?: Schedule;
	strands: readonly StrandConfig[];
	summary?: string;
	theme: { dark: string; light: string };
	title: string;
	tutor: string;
}
