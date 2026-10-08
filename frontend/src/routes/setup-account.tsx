import { createFileRoute } from "@tanstack/react-router";
import { SetupAccountPage } from "@/components/portal/Portal";

export const Route = createFileRoute("/setup-account")({ component: SetupAccountPage });
