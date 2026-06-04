import { ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import FormField, { Input } from "@/components/ui/FormField";

export default function AuthTestPage() {
  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Connexion ONEPILOT"
      subtitle="Page de test pour préparer l'authentification."
      footer="Version locale de démonstration"
    >
      <div className="grid gap-4">
        <FormField label="Email" required>
          <Input type="email" placeholder="mohamed@email.com" />
        </FormField>

        <FormField label="Mot de passe" required>
          <Input type="password" placeholder="••••••••" />
        </FormField>

        <button
          type="button"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Se connecter
        </button>
      </div>
    </AuthLayout>
  );
}