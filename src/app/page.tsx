import { redirect } from "next/navigation";
import { homeRoute } from "@/lib/course/config";

export default function HomePage() {
	redirect(homeRoute);
}
