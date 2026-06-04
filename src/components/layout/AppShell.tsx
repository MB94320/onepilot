import Topbar from "@/components/layout/Topbar";
import Sidebar from "@/components/layout/Sidebar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AppShell({
  title,
  subtitle,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Topbar title={title} subtitle={subtitle} />

      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Sidebar />

          <section className="min-w-0">{children}</section>
        </div>
      </main>
    </div>
  );
}