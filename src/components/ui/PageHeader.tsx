type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;

  /*
   * flush supprime la marge basse interne.
   * À utiliser dans les pages structurées avec space-y-6.
   */
  flush?: boolean;
};

export default function PageHeader({
  title,
  subtitle,
  actions,
  children,
  flush = false,
}: PageHeaderProps) {
  const hasActions =
    Boolean(actions) ||
    Boolean(children);

  return (
    <header
      className={`flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${
        flush ? "" : "mb-6"
      }`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {hasActions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {actions}
          {children}
        </div>
      )}
    </header>
  );
}