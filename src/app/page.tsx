import { FolderKanban, AlertCircle, DollarSign } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import KPICard from "@/components/ui/KPICard";

export default function HomePage() {
  return (
    <AppShell
      title="Tableau de bord"
      subtitle="Base locale ONEPILOT en reconstruction progressive."
    >
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <PageHeader
          title="ONEPILOT"
          subtitle="Base locale propre créée avec Next.js. Nous reconstruisons progressivement l'application à partir des fichiers récupérés."
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StatusBadge value="active" label="Projet actif" />
          <StatusBadge value="planning" label="Structure en cours" />
          <StatusBadge value="pending" label="Réintégration progressive" />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <KPICard
            title="Projets"
            value="12"
            subtitle="Base de démonstration"
            trend="up"
            trendValue="+2 ce mois"
            icon={FolderKanban}
            color="blue"
          />

          <KPICard
            title="Non-conformités"
            value="3"
            subtitle="À traiter"
            trend="down"
            trendValue="-1 cette semaine"
            icon={AlertCircle}
            color="amber"
          />

          <KPICard
            title="Marge"
            value="18%"
            subtitle="Indicateur provisoire"
            trend="up"
            trendValue="+4%"
            icon={DollarSign}
            color="green"
          />
        </div>
      </div>
    </AppShell>
  );
}