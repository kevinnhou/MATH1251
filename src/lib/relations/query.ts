import type {
	CourseChapter,
	CourseIndex,
	CoursePage,
	Direction,
} from "./types";

export function neighbours(
	index: CourseIndex,
	id: string,
	direction: Direction
): readonly CoursePage[] {
	return index.neighbours[direction].get(id) ?? [];
}

export function chapterOfId(
	index: CourseIndex,
	id: string
): CourseChapter | undefined {
	const page = index.pageById.get(id);
	return page && index.chapters[page.chapter];
}
