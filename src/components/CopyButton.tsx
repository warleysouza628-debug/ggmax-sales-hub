import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function CopyButton({ text, label = "Copiar", ...props }: { text: string; label?: string } & ButtonProps) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      {...props}
    >
      {done ? <Check className="text-success" /> : <Copy />} {done ? "Copiado ✓" : label}
    </Button>
  );
}
