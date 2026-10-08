import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPage } from "@/components/portal/Portal";

export const Route = createFileRoute("/admin")({ component: AdminDashboardPage });
