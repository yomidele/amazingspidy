import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyFieldProps {
  label: string;
  value: string | null | undefined;
  /** Optional icon shown before the label */
  icon?: React.ReactNode;
  /** Render value in monospace */
  mono?: boolean;
  /** Visual variant — "dark" works on glass/dark surfaces, "light" on cards */
  variant?: "light" | "dark";
  className?: string;
}

/**
 * A single copy-to-clipboard field. Each instance copies ONLY its own value.
 *
 * Usage:
 *   <CopyField label="Account Number" value="1234567890" mono />
 */
const CopyField = ({ label, value, icon, mono, variant = "light", className }: CopyFieldProps) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Please copy manually.");
    }
  };

  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg px-3 py-2 border transition-colors",
        isDark
          ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
          : "bg-muted/40 border-border hover:bg-muted/70",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[10px] uppercase tracking-wider",
            isDark ? "text-white/50" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {icon}
          <p
            className={cn(
              "text-sm truncate",
              mono && "font-mono",
              isDark ? "text-white" : "text-foreground",
            )}
          >
            {value}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        className={cn(
          "flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors",
          isDark
            ? "bg-white/10 hover:bg-white/20 text-white"
            : "bg-background hover:bg-accent text-foreground border border-border",
        )}
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default CopyField;
