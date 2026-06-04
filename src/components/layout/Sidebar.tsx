import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  ShieldAlert,
  DollarSign,
  Users,
  BarChart3,
} from "lucide-react";

const navGroups = [
  {
    label: "EXÉCUTIF",
    items: [
      { label: "Tableau de bord", href: "/", icon: LayoutDashboard },
      { label: "Reporting", href: "/reporting", icon: BarChart3 },
    ],
  },
  {
    label: "OPÉRATIONS",
    items: [
      { label: "Projets", href: "/projects", icon: FolderKanban },
      { label: "Ressources", href: "/resources", icon: Users },
    ],
  },
  {
    label: "RISQUES & FINANCE",
    items: [
      { label: "Risques & Qualité", href: "/risks", icon: ShieldAlert },
      { label: "Finance", href: "/finance", icon: DollarSign },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm lg:w-72">
      <div className="mb-4 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          ONEPILOT
        </p>
        <h2 className="mt-2 text-lg font-bold text-card-foreground">
          Navigation
        </h2>
      </div>

      <nav className="flex flex-col gap-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {group.label}
            </p>

            <div className="flex flex-col gap-2">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-card-foreground transition hover:bg-accent"
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}