const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const write = (relative, content) => fs.writeFileSync(path.join(root, relative), content, "utf8");

function replaceOrFail(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Patch introuvable: ${label}`);
  }
  return content.replace(search, replacement);
}

function patchWeeklyWorkPattern() {
  const file = "src/components/hr/HrWeeklyWorkPatternFields.tsx";
  let content = read(file);
  content = content.replaceAll('type="number"', 'type="text"');
  content = content.replaceAll('min="0"', 'inputMode="decimal"');
  content = content.replaceAll('step="0.25"', '');
  content = content.replaceAll('step="any"', '');
  write(file, content);
  console.log("OK", file);
}

function patchAbsencesPage() {
  const file = "src/app/[orgId]/(protected)/rh/absences/page.tsx";
  let content = read(file);

  if (!content.includes('resource: "all"')) {
    content = replaceOrFail(
      content,
      '  type: "all",\n  site: "all",',
      '  type: "all",\n  resource: "all",\n  site: "all",',
      "initialFilters.resource",
    );
  }

  if (!content.includes("const matchesResource =")) {
    content = replaceOrFail(
      content,
      '        const matchesSite =\n          filters.site === "all" ||\n          request.site_name === filters.site;',
      '        const matchesResource =\n          filters.resource === "all" ||\n          request.employee_id === filters.resource ||\n          request.employee_name === filters.resource;\n\n        const matchesSite =\n          filters.site === "all" ||\n          request.site_name === filters.site;',
      "filteredRequests.matchesResource",
    );
    content = replaceOrFail(
      content,
      '          matchesType &&\n          matchesSite &&',
      '          matchesType &&\n          matchesResource &&\n          matchesSite &&',
      "filteredRequests.return.matchesResource",
    );
  }

  if (!content.includes("const filteredBalances = useMemo")) {
    content = replaceOrFail(
      content,
      '  const metrics = useMemo(() => {',
      `  const filteredBalances = useMemo(() => {\n    if (!data) {\n      return [];\n    }\n\n    const normalizedSearch = filters.search.trim().toLowerCase();\n\n    return data.balances.filter((balance) => {\n      const searchableContent = [\n        balance.employee_name,\n        balance.first_name,\n        balance.last_name,\n        balance.employee_number,\n        balance.absence_type_name,\n        balance.absence_type_code,\n        balance.site_name,\n        balance.department_name,\n      ]\n        .filter(Boolean)\n        .join(" ")\n        .toLowerCase();\n\n      const matchesSearch =\n        normalizedSearch.length === 0 ||\n        searchableContent.includes(normalizedSearch);\n\n      const matchesResource =\n        filters.resource === "all" ||\n        balance.employee_id === filters.resource ||\n        balance.employee_name === filters.resource;\n\n      const matchesType =\n        filters.type === "all" ||\n        balance.absence_type_name === filters.type;\n\n      const matchesSite =\n        filters.site === "all" ||\n        balance.site_name === filters.site;\n\n      return matchesSearch && matchesResource && matchesType && matchesSite;\n    });\n  }, [data, filters]);\n\n  const metrics = useMemo(() => {`,
      "filteredBalances.insert",
    );
  }

  content = content.replaceAll('balances={data.balances}', 'balances={filteredBalances}');
  content = content.replaceAll('balances={data?.balances ?? []}', 'balances={filteredBalances}');
  content = content.replaceAll('className="overflow-x-auto"', 'className="max-h-[430px] overflow-auto"');
  content = content.replaceAll('className="bg-slate-50/80 dark:bg-slate-900/70"', 'className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95"');
  write(file, content);
  console.log("OK", file);
}

patchWeeklyWorkPattern();
patchAbsencesPage();
console.log("Patch RH Absences/Ressources V5.5 terminé.");
