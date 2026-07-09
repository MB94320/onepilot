const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  const full = path.join(root, rel);
  if (!fs.existsSync(`${full}.bak_v5_6`)) {
    fs.writeFileSync(`${full}.bak_v5_6`, fs.readFileSync(full));
  }
  fs.writeFileSync(full, content);
  console.log(`OK ${rel}`);
}

function replaceOrWarn(content, pattern, replacement, label) {
  if (typeof pattern === "string") {
    if (!content.includes(pattern)) {
      console.warn(`WARN: motif introuvable pour ${label}`);
      return content;
    }
    return content.replace(pattern, replacement);
  }
  if (!pattern.test(content)) {
    console.warn(`WARN: motif introuvable pour ${label}`);
    return content;
  }
  return content.replace(pattern, replacement);
}

function patchWeeklyWorkPattern() {
  const rel = "src/components/hr/HrWeeklyWorkPatternFields.tsx";
  let content = read(rel);

  content = content.replace(/type="number"/g, 'type="text"');
  content = content.replace(/\s+step="0\.25"/g, "");
  content = content.replace(/\n\s*inputMode="decimal"\s*\n\s*inputMode="decimal"/g, '\n                          inputMode="decimal"');

  write(rel, content);
}

function patchAbsenceFilters() {
  const rel = "src/components/hr/HrAbsenceFilters.tsx";
  const source = fs.readFileSync(path.join(__dirname, "HrAbsenceFilters_v5_6.tsx"), "utf8");
  write(rel, source);
}

function patchAbsencesPage() {
  const rel = "src/app/[orgId]/(protected)/rh/absences/page.tsx";
  let content = read(rel);

  content = replaceOrWarn(
    content,
    /const initialFilters: HrAbsenceFiltersValue = \{\s*search: "",\s*status: "all",/,
    'const initialFilters: HrAbsenceFiltersValue = {\n  search: "",\n  resource: "all",\n  status: "all",',
    "initialFilters.resource",
  );

  content = replaceOrWarn(
    content,
    /const matchesSite = filters\.site === "all" \|\| request\.site_name === filters\.site;/,
    'const matchesSite = filters.site === "all" || request.site_name === filters.site;\n        const matchesResource = filters.resource === "all" || request.employee_name === filters.resource;',
    "filteredRequests.matchesResource",
  );

  content = replaceOrWarn(
    content,
    /matchesType &&\s*matchesSite &&\s*matchesPeriod &&/,
    'matchesType &&\n          matchesSite &&\n          matchesResource &&\n          matchesPeriod &&',
    "filteredRequests.return.matchesResource",
  );

  content = replaceOrWarn(
    content,
    /\}, \[\s*data,\s*filters,\s*\]\);\s*const metrics = useMemo/,
    `}, [
    data,
    filters,
  ]);

  const filteredBalances = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedSearch = filters.search.trim().toLowerCase();

    return data.balances.filter((balance) => {
      const searchableContent = [
        balance.employee_name,
        balance.employee_number,
        balance.absence_type_name,
        balance.absence_type_code,
        balance.site_name,
        balance.department_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableContent.includes(normalizedSearch);
      const matchesResource =
        filters.resource === "all" || balance.employee_name === filters.resource;
      const matchesType =
        filters.type === "all" || balance.absence_type_name === filters.type;
      const matchesSite =
        filters.site === "all" || balance.site_name === filters.site;

      return matchesSearch && matchesResource && matchesType && matchesSite;
    });
  }, [data, filters]);

  const metrics = useMemo`,
    "filteredBalances.useMemo",
  );

  content = content.replace(/balances=\{data\.balances\}/g, "balances={filteredBalances}");

  content = replaceOrWarn(
    content,
    /const managerRequests = requests\.filter\([\s\S]*?const visibleRequests = \[\s*\.\.\.managerRequests,\s*\.\.\.hrRequests,\s*\];/,
    `const visibleRequests = requests.filter(
    (request) =>
      !request.is_archived &&
      ["submitted", "manager_approved", "approved", "rejected", "cancelled"].includes(request.status),
  );`,
    "ApprovalQueuePanel.visibleRequests",
  );

  content = content.replace(/const isManagerStep = request\.status === "submitted";/g, 'const isManagerStep = request.status === "submitted";\n                  const isHrStep = request.status === "manager_approved";');

  content = replaceOrWarn(
    content,
    /\{isManagerStep \? \([\s\S]*?\) : \([\s\S]*?onHrApprove\(request\)[\s\S]*?Approuver RH[\s\S]*?\)\}/,
    `{isManagerStep ? (
                    <button
                      type="button"
                      onClick={() => onManagerApprove(request)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white shadow-md shadow-violet-100 transition hover:-translate-y-0.5 hover:bg-violet-700 dark:shadow-none"
                    >
                      Valider N+1
                    </button>
                  ) : isHrStep ? (
                    <button
                      type="button"
                      onClick={() => onHrApprove(request)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-md shadow-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-700 dark:shadow-none"
                    >
                      Approuver RH
                    </button>
                  ) : null}`,
    "ApprovalQueuePanel.buttons",
  );

  content = replaceOrWarn(
    content,
    /function BalancesPanel\(\{[\s\S]*?\n\}\s*const exportColumns:/,
    `function BalancesPanel({
  balances,
}: {
  balances: AbsenceBalance[];
}) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("cards");

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={WalletCards}
        title="Soldes d’absence"
        description="Droits, reports, consommations, demandes en cours et solde restant par collaborateur et par type d’absence."
        accent="amber"
        countText={\
          \`
          \${balances.length} ligne\${balances.length > 1 ? "s" : ""}
        \`}
        right={<ViewSwitch mode={displayMode} onChange={setDisplayMode} />}
      />

      {balances.length === 0 ? (
        <EmptyState
          title="Aucun solde à afficher"
          description="Les soldes suivis apparaîtront ici après création des compteurs CP / RTT et selon les filtres appliqués."
          icon={WalletCards}
        />
      ) : displayMode === "cards" ? (
        <div className="max-h-[520px] overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {balances.map((balance) => (
              <BalanceCard key={balance.id} balance={balance} />
            ))}
          </div>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[1180px]">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="sticky left-0 z-30 bg-slate-50/95 px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-900/95">
                  Collaborateur
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Type d’absence</th>
                <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Période</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Droit</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Report</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Ajustement</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Consommé</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">En cours</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {balances.map((balance) => {
                const availableBalance = getBalanceAvailable(balance);
                return (
                  <tr key={balance.id} className="transition hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 dark:bg-slate-950">
                      <div className="flex items-center gap-3">
                        <BalanceAvatar balance={balance} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                            {balance.employee_name ?? "Collaborateur non renseigné"}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                            {balance.employee_number ?? "Matricule non renseigné"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {balance.department_name ?? "Service non renseigné"} · {balance.site_name ?? "Site non renseigné"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {balance.absence_type_name ?? "Type non renseigné"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        {balance.absence_type_code ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-slate-500">
                      {formatDate(balance.period_start)} → {formatDate(balance.period_end)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-black text-slate-900 dark:text-white">{formatNumber(balance.annual_entitlement)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">{formatNumber(balance.carried_over_amount)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">{formatNumber(balance.adjustment_amount)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-rose-600 dark:text-rose-300">{formatNumber(balance.consumed_amount)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-amber-600 dark:text-amber-300">{formatNumber(balance.pending_amount)}</td>
                    <td className={\
                      \`px-3 py-3 text-right text-sm font-black \${getBalanceClasses(availableBalance)}\`
                    }>
                      {formatNumber(availableBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const exportColumns:`,
    "BalancesPanel.row-per-balance",
  );

  content = content.replace(/new ClipboardItem\(\{\s*"image\/png": pngBlob,[\s\S]*?\}\),\s*\]\);\s*return;/, `new ClipboardItem({
              "image/png": pngBlob,
            }),
          ]);
          return;`);

  write(rel, content);
}

function main() {
  patchWeeklyWorkPattern();
  patchAbsenceFilters();
  patchAbsencesPage();
  console.log("Patch RH absences/ressources V5.6 terminé. Lance ensuite npm run build.");
}

main();
