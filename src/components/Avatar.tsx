import { cn } from "@/lib/utils";

export function Avatar({ name, url, className }: { name?: string | null; url?: string | null; className?: string }) {
  if (url) return <img src={url} alt="" className={cn("size-8 rounded-full object-cover", className)} />;
  return (
    <div className={cn("grid size-8 place-items-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground", className)}>
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
