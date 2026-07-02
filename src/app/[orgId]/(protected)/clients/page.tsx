"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Download, Edit, Trash2, Building2, Users } from "lucide-react";
import * as XLSX from 'xlsx';
import ClientForm from "./ClientForm";

const supabase = createClient();

export default function ClientsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: slugOrId } = use(params);
  const qc = useQueryClient();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({ name: "all", sector: "all", country: "all", city: "all", contact: "all", service: "all", role: "all" });

  const { data: currentOrgId } = useQuery({
    queryKey: ['org-uuid', slugOrId],
    queryFn: async () => {
      if (slugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return slugOrId;
      const { data } = await supabase.from('organizations').select('id').eq('slug', slugOrId).single();
      return data?.id || null;
    }
  });

  const { data: clients = [], refetch } = useQuery({
    queryKey: ['clients', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const { data } = await supabase.from('clients').select('*').eq('organization_id', currentOrgId);
      return data || [];
    },
    enabled: !!currentOrgId
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients', currentOrgId] });
      refetch();
    },
    onError: (error: any) => {
      alert("Impossible de supprimer ce client : il est toujours rattaché à des opportunités ou avant-ventes actives.\nErreur : " + error.message);
    }
  });

  const openCreate = () => { setSelectedClient(null); setModal('create'); };
  const openEdit = (client: any) => { setSelectedClient(client); setModal('edit'); };

  // INTÉGRATION DE L'ADRESSE MAIL DANS L'EXPORT EXCEL
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(clients.map((c: any) => ({
      'Nom Entreprise': c.name,
      'Secteur': c.sector || '—',
      'Adresse': c.address || '—',
      'Code Postal': c.zip || '—',
      'Ville': c.city || '—',
      'Pays': c.country || '—',
      'Contact Client': c.contact || '—',
      'Rôle Contact': c.contact_role || '—',
      'Adresse E-mail': c.email || '—',
      'Téléphone': c.phone || '—',
      'Service Concerné': c.service || '—',
      'Notes / Suivi': c.notes || '—'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "Suivi_Clients.xlsx");
  };

  const names = ["all", ...new Set(clients.map((c: any) => c.name).filter(Boolean))];
  const sectors = ["all", ...new Set(clients.map((c: any) => c.sector).filter(Boolean))];
  const countries = ["all", ...new Set(clients.map((c: any) => c.country).filter(Boolean))];
  const cities = ["all", ...new Set(clients.map((c: any) => c.city).filter(Boolean))];
  const contacts = ["all", ...new Set(clients.map((c: any) => c.contact).filter(Boolean))];
  const services = ["all", ...new Set(clients.map((c: any) => c.service).filter(Boolean))];
  const roles = ["all", ...new Set(clients.map((c: any) => c.contact_role).filter(Boolean))];

  const filteredClients = clients.filter((c: any) => {
    if (searchText && !`${c.name} ${c.contact} ${c.city} ${c.sector} ${c.contact_role} ${c.email}`.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (filters.name !== "all" && c.name !== filters.name) return false;
    if (filters.sector !== "all" && c.sector !== filters.sector) return false;
    if (filters.country !== "all" && c.country !== filters.country) return false;
    if (filters.city !== "all" && c.city !== filters.city) return false;
    if (filters.contact !== "all" && c.contact !== filters.contact) return false;
    if (filters.service !== "all" && c.service !== filters.service) return false;
    if (filters.role !== "all" && c.contact_role !== filters.role) return false;
    return true;
  });

  return (
    <div className="space-y-3 pt-0 px-2 font-sans text-[11px] text-slate-600 dark:text-slate-400 select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center h-8">
        <h1 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Suivi clients</h1>
        <div className="flex gap-2">
          <button onClick={exportToExcel} className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 h-6 rounded text-[10px] font-medium hover:bg-emerald-700"><Download size={11} /> Exporter</button>
          <button onClick={openCreate} className="h-6 px-2.5 bg-blue-600 text-white font-medium rounded text-[10px] hover:bg-blue-700 transition-colors">+ Nouveau client</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
          <div className="w-9 h-9 rounded bg-blue-500/10 flex items-center justify-center"><Building2 size={16} className="text-blue-500" /></div>
          <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Total Entreprises</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none">{clients.length}</p></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
          <div className="w-9 h-9 rounded bg-indigo-500/10 flex items-center justify-center"><Users size={16} className="text-indigo-500" /></div>
          <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Total Contacts</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none">{clients.length}</p></div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-2 rounded space-y-3">
        <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Rechercher nom, contact, rôle, secteur..." className="w-full h-8 px-2 text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})} className="h-7 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="all">Nom Entreprise</option>{names.map(n => n !== "all" && <option key={n} value={n}>{n}</option>)}</select>
          <select value={filters.sector} onChange={e => setFilters({...filters, sector: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="all">Secteur</option>{sectors.map(s => s !== "all" && <option key={s} value={s}>{s}</option>)}</select>
          <select value={filters.country} onChange={e => setFilters({...filters, country: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="all">Pays</option>{countries.map(c => c !== "all" && <option key={c} value={c}>{c}</option>)}</select>
          <select value={filters.city} onChange={e => setFilters({...filters, city: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="all">Ville</option>{cities.map(c => c !== "all" && <option key={c} value={c}>{c}</option>)}</select>
          <select value={filters.contact} onChange={e => setFilters({...filters, contact: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="all">Contact</option>{contacts.map(c => c !== "all" && <option key={c} value={c}>{c}</option>)}</select>
          <select value={filters.role} onChange={e => setFilters({...filters, role: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="all">Rôle</option>{roles.map(r => r !== "all" && <option key={r} value={r}>{r}</option>)}</select>
          <select value={filters.service} onChange={e => setFilters({...filters, service: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="all">Service</option>{services.map(s => s !== "all" && <option key={s} value={s}>{s}</option>)}</select>
        </div>
      </div>

      {/* TABLEAU COMPACT AVEC SCROLL HORIZONTAL ET COLONNE ADRESSE MAIL AJOUTÉE */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto bg-white dark:bg-slate-900/40 max-w-full">
        <table className="w-full text-left border-collapse min-w-[1650px]">
          <thead className="bg-slate-200/60 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[9px] uppercase font-semibold tracking-wide">
            <tr>
              {['Nom entreprise', 'Secteur', 'Adresse', 'CP', 'Ville', 'Pays', 'Contact', 'Rôle', 'Adresse E-mail', 'Tel', 'Service', 'Notes', 'Actions'].map(h => (
                <th key={h} className="p-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
            {filteredClients.length === 0 ? (
              <tr><td colSpan={13} className="p-4 text-center text-slate-400 italic">Aucune donnée disponible.</td></tr>
            ) : filteredClients.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-2 font-medium text-slate-900 dark:text-white whitespace-nowrap">{c.name}</td>
                <td className="p-2 whitespace-nowrap">{c.sector || '—'}</td>
                <td className="p-2 truncate max-w-[120px]">{c.address || '—'}</td>
                <td className="p-2 font-mono whitespace-nowrap">{c.zip || '—'}</td>
                <td className="p-2 whitespace-nowrap">{c.city || '—'}</td>
                <td className="p-2 whitespace-nowrap">{c.country || '—'}</td>
                <td className="p-2 whitespace-nowrap">{c.contact || '—'}</td>
                <td className="p-2 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">{c.contact_role || '—'}</td>
                <td className="p-2 whitespace-nowrap font-mono text-blue-600 dark:text-blue-400">{c.email || '—'}</td>
                <td className="p-2 font-mono whitespace-nowrap">{c.phone || '—'}</td>
                <td className="p-2 whitespace-nowrap">{c.service || '—'}</td>
                <td className="p-2 truncate max-w-[150px] text-slate-400">{c.notes || '—'}</td>
                <td className="p-2">
                  <div className="flex gap-2 items-center">
                    <button onClick={() => openEdit(c)} className="text-blue-500 hover:text-blue-600 transition-colors"><Edit size={11} /></button>
                    <button onClick={() => { if(confirm('Supprimer cette entreprise ?')) remove.mutate(c.id); }} className="text-red-500 hover:text-red-600 transition-colors"><Trash2 size={11} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <ClientForm modalMode={modal} clientData={selectedClient} orgSlugOrId={slugOrId} onClose={() => setModal(null)} onSave={() => { setModal(null); refetch(); }} />}
    </div>
  );
}