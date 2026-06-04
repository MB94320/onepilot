import { TrendingDown, TrendingUp, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KPICardProps = {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: LucideIcon;
  color?: "primary" | "green" | "amber" | "red" | "purple" | "blue";
  onClick?: () => void;
};

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  color = "primary",
  onClick,
}: KPICardProps) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
      ? "text-red-500"
      : "text-slate-500";

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("rounded-lg p-2.5", colors[color])}>
          {Icon && <Icon size={18} />}
        </div>

        {trendValue !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon size={12} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold leading-tight text-slate-900">{value}</div>
        <div className="mt-0.5 text-sm font-medium text-slate-900">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
      </div>
    </div>
  );
}