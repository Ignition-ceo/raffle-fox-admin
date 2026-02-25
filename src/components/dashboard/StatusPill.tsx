import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string;
  label?: string;
}

function getConfig(status: string): { className: string; label: string } {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "live": return { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Live" };
    case "active": return { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" };
    case "ended": return { className: "bg-red-50 text-red-700 border-red-200", label: "Ended" };
    case "inactive": return { className: "bg-gray-100 text-gray-600 border-gray-200", label: "Inactive" };
    case "pending": return { className: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" };
    case "draft": return { className: "bg-slate-50 text-slate-600 border-slate-200", label: "Draft" };
    case "low": return { className: "bg-red-50 text-red-700 border-red-200", label: "Low" };
    case "medium": return { className: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium" };
    case "high": return { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "High" };
    case "admin": return { className: "bg-violet-50 text-violet-700 border-violet-200", label: "Admin" };
    case "super_admin": return { className: "bg-violet-50 text-violet-700 border-violet-200", label: "Super Admin" };
    case "staff": return { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Staff" };
    case "blocked": case "banned": return { className: "bg-red-50 text-red-700 border-red-200", label: "Blocked" };
    case "suspended": return { className: "bg-orange-50 text-orange-700 border-orange-200", label: "Suspended" };
    default: return { className: "bg-gray-50 text-gray-600 border-gray-200", label: status || "Unknown" };
  }
}

export function StatusPill({ status, label }: StatusPillProps) {
  const config = getConfig(status);
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", config.className)}>
      {label || config.label}
    </span>
  );
}
