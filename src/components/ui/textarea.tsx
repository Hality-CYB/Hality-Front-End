import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground bg-background focus-visible:bg-card focus-visible:border-primary focus-visible:ring-primary/10 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex field-sizing-content min-h-24 w-full rounded-[13px] border-[1.5px] border-transparent px-4 py-3.5 text-[15px] transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
