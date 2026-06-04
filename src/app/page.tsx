"use client";

import { useState } from "react";
import { FolderKanban, AlertCircle, DollarSign } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import KPICard from "@/components/ui/KPICard";
import Modal from "@/components/ui/Modal";
import FormField, {
  Input,
  Select,
  Textarea,
} from "@/components/ui/FormField";

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <AppShell
      title="Tableau de bord"
      subtitle="Base locale ONEPILOT en reconstruction progressive."
    >
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <PageHeader
          title="ONEPILOT"
          subtitle="Base locale propre créée avec Next.js. Nous reconstruisons progressivement l'application à partir des fichiers récupérés."
          actions={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Ouvrir le modal de test
            </button>
          }
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Créer un projet de test"
      >
        <div className="grid gap-4">
          <FormField label="Nom du projet" required>
            <Input placeholder="Ex: Déploiement ERP" />
          </FormField>

          <FormField label="Statut">
            <Select defaultValue="planning">
              <option value="planning">Planning</option>
              <option value="active">Actif</option>
              <option value="completed">Terminé</option>
            </Select>
          </FormField>

          <FormField label="Description">
            <Textarea placeholder="Décris brièvement le projet..." />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}