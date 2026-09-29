"use client";

import { usePathname } from "fumadocs-core/framework";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
	type CourseRoutes,
	indexRoutes,
	type RouteIndex,
	type RouteMatch,
} from "@/lib/course/routes";
import { homeRoute } from "@/lib/site/config";

const CourseRoutesContext = createContext<RouteIndex | null>(null);

export function CourseRoutesProvider({
	children,
	routes,
}: {
	children: ReactNode;
	routes: CourseRoutes;
}) {
	const index = useMemo(() => indexRoutes(routes), [routes]);
	return (
		<CourseRoutesContext.Provider value={index}>
			{children}
		</CourseRoutesContext.Provider>
	);
}

export function useCourseRoutes(): RouteIndex {
	const value = useContext(CourseRoutesContext);
	if (!value) {
		throw new Error(
			"useCourseRoutes must be used within CourseRoutesProvider."
		);
	}

	return value;
}

export function useCurrentRoute(): RouteMatch & { url: string } {
	const routes = useCourseRoutes();
	const url = usePathname() || homeRoute;
	return useMemo(() => ({ ...routes.match(url), url }), [routes, url]);
}
