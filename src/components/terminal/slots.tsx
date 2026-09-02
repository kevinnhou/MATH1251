"use client";

import {
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "fumadocs-ui/layouts/docs/slots/sidebar";
import { TerminalHeader } from "./header";
import { TerminalSidebar } from "./sidebar";

export const terminalDocsSlots = {
	header: TerminalHeader,
	searchTrigger: false as const,
	sidebar: {
		provider: SidebarProvider,
		root: TerminalSidebar,
		trigger: SidebarTrigger,
		useSidebar,
	},
};
