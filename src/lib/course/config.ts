import config from "course.config";
import type { CourseConfig, Schedule } from "./types";

export const course: typeof config & CourseConfig = config;

if (!course.strands.some(({ id }) => id === course.home)) {
	throw new Error(`course.config: home "${course.home}" is not a strand.`);
}

export const homeRoute = `/${course.home}`;

export const schedule: Schedule = course.schedule ?? "parallel";

export const repoUrl = `https://github.com/${course.repo.owner}/${course.repo.name}`;

const CODE_PARTS = /^(\D+)(\d.*)$/;
const [, subject = course.code, number = ""] =
	CODE_PARTS.exec(course.code) ?? [];

export const wordmark = { number, subject };
