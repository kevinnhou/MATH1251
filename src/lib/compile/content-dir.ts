import { course, repoUrl } from "@/lib/course/config";

export const contentDir = "content/docs";

export function contentSourceUrl(path: string): string {
	return `${repoUrl}/blob/${course.repo.branch}/${contentDir}/${path}`;
}
