"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { hrCancelButtonClassName, hrSaveButtonClassName } from "@/components/hr/HrReferenceUi";

const supabase = createClient();

interface FormProps {
  modalMode: "create" | "edit";
  clientData?: any;
  orgSlugOrId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function ClientForm({ modalMode, clientData, orgSlugOrId, onClose, onSave }: FormProps) {
  const [f, setF] = useState({
    name: "", sector: "", address: "", zip: "", city: "", country: "", email: "", contact: "", phone: "", service: "", notes: "", contact_role: ""
  });

  useEffect(() => {
    if (modalMode === "edit" && clientData) {
      setF({
        name: clientData.name || "",
        sector: clientData.sector || "",
        address: clientData.address || "",
        zip: clientData.zip || "",
        city: clientData.city || "",
        country: clientData.country || "",
        email: clientData.email || "",
        contact: clientData.contact || "",
        phone: clientData.phone || "",
        service: clientData.service || "",
        notes: clientData.notes || "",
        contact_role: clientData.contact_role || ""
      });
    }
  }, [modalMode, clientData]);

  // Écouteur automatique de Code Postal
  useEffect(() => {
    if (f.zip && f.zip.trim().length === 5) {
      fetch(`https://geo.api.gouv.fr/communes?codePostal=${f.zip}&fields=nom&format=json`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setF(prev => ({ ...prev, city: data[0].nom, country: "France" }));
          }
        })
        .catch(err => console.error("Erreur géo-déduction:", err));
    }
  }, [f.zip]);

  const handleSave = async () => {
    let finalOrgId = orgSlugOrId;
    const isUUID = orgSlugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    if (!isUUID) {
      const { data } = await supabase.from('organizations').select('id').eq('slug', orgSlugOrId).maybeSingle();
      if (data?.id) finalOrgId = data.id;
    }
    
    if (modalMode === "create") {
      const { error } = await supabase.from('clients').insert([{ ...f, organization_id: finalOrgId } as any]);
      if (error) alert("Erreur d'enregistrement : " + error.message);
      else onSave();
    } else {
      const { error } = await supabase.from('clients').update(f as any).eq('id', clientData.id);
      if (error) alert("Erreur de mise à jour : " + error.message);
      else onSave();
    }
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4">
          <h3 className="text-lg font-black text-slate-950">
            {modalMode === "create" ? "Créer un nouveau client" : "Modifier la fiche client"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">Référentiel partagé avec les opportunités, commandes, projets et factures.</p>
        </header>

        {/* GRILLE PHILOSOPHIE PROSPECTFORM : LABEL EN HAUT ET PLACEHOLDER DEDANS */}
        <div className="grid grid-cols-6 gap-4 p-5 text-sm">
          
          {/* Ligne 1 : Entreprise + Secteur (Côte à côte) */}
          <div className="col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Nom de l'entreprise *</label>
            <input value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Ex: Onepilot Enterprise" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Secteur d'activité</label>
            <input value={f.sector} onChange={e => setF({...f, sector: e.target.value})} placeholder="Ex: Aéronautique, Énergie..." className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          {/* Ligne 2 : Adresse (En dessous) + Code Postal (A côté) */}
          <div className="col-span-4">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Adresse (N° et rue)</label>
            <input value={f.address} onChange={e => setF({...f, address: e.target.value})} placeholder="Ex: 14 Rue de la Paix" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Code Postal</label>
            <input value={f.zip} onChange={e => setF({...f, zip: e.target.value})} placeholder="Ex: 75001" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          {/* Ligne 3 : Ville (En dessous) + Pays (A côté) */}
          <div className="col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Ville</label>
            <input value={f.city} onChange={e => setF({...f, city: e.target.value})} placeholder="Ex: Paris" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Pays</label>
            <input value={f.country} onChange={e => setF({...f, country: e.target.value})} placeholder="Ex: France" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          {/* Ligne 4 : Nom du contact (En dessous) + Service concerné (A côté) + Rôle (A côté) */}
          <div className="col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Nom complet du contact</label>
            <input value={f.contact} onChange={e => setF({...f, contact: e.target.value})} placeholder="Ex: Jean Dupont" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Service concerné</label>
            <input value={f.service} onChange={e => setF({...f, service: e.target.value})} placeholder="Ex: Achats, Direction..." className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Rôle du contact</label>
            <input value={f.contact_role} onChange={e => setF({...f, contact_role: e.target.value})} placeholder="Ex: Acheteur, Directeur..." className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          {/* Ligne 5 : Adresse e-mail (En dessous) + N° de téléphone (A côté) */}
          <div className="col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Adresse e-mail de contact</label>
            <input type="email" value={f.email} onChange={e => setF({...f, email: e.target.value})} placeholder="Ex: contact@entreprise.com" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">N° Téléphone</label>
            {/* FORCE LE COMPORTEMENT ET LA DETECTION SMARTPHONE / FORMAT NUMERIQUE */}
            <input type="tel" value={f.phone} onChange={e => setF({...f, phone: e.target.value})} placeholder="Ex: +33 6 12 34 56 78" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          {/* Ligne 6 : Commentaires / Notes de suivi (En dessous) */}
          <div className="col-span-6">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Commentaires / Notes de suivi</label>
            <textarea value={f.notes} onChange={e => setF({...f, notes: e.target.value})} rows={2} placeholder="Historique des échanges, contraintes contractuelles..." className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none resize-none" />
          </div>

        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-200 p-5">
          <button onClick={onClose} className={hrCancelButtonClassName}>Annuler</button>
          <button onClick={handleSave} disabled={!f.name} className={hrSaveButtonClassName}>
            Enregistrer
          </button>
        </footer>

      </section>
    </div>
  );
}
