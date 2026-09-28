import { DashboardShell } from "@/components/dash/Shell";

export const metadata = { title: "Workspace — DataOps" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
