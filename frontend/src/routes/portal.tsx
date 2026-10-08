import { createFileRoute } from "@tanstack/react-router";
import { ClientPortalPage } from "@/components/portal/Portal";

export const Route = createFileRoute("/portal")({ component: ClientPortalPage });
