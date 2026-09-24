import { redirect } from "next/navigation";
import { homeRoute } from "@/lib/site/config";

export default function HomePage() {
	redirect(homeRoute);
}
