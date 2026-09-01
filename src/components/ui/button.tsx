import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Porta Design/'s Btn (shared/UI.tsx) pros variantes/tamanhos do shadcn —
 * fonte única de padronização de botão do app. `primary`/`secondary`/
 * `ghost`/`danger`/`success` == os 5 variantes de Design/; `outline` e
 * `link` são extras do shadcn mantidos por utilidade geral.
 */
const buttonVariants = cva(
  "font-heading group/button inline-flex shrink-0 items-center justify-center gap-1.75 border border-transparent text-center font-bold tracking-tight whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring active:scale-[0.96] active:opacity-85 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-[0_2px_8px_rgba(11,107,130,0.25)]",
        // "default" é só um alias de "primary" — alguns componentes shadcn
        // vendorizados (dialog.tsx/alert-dialog.tsx) referenciam variant="default"
        // internamente, então o nome fica disponível sem duplicar o estilo.
        default: "bg-primary text-white shadow-[0_2px_8px_rgba(11,107,130,0.25)]",
        secondary: "bg-secondary text-primary",
        ghost: "text-primary bg-transparent",
        danger: "bg-[#FEE2E2] text-[#DC2626]",
        success:
          "bg-[image:var(--gradient-green)] text-white shadow-[0_2px_8px_rgba(22,163,74,0.25)]",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "gap-1.75 rounded-[12px] px-4.5 py-3 text-sm",
        sm: "gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px]",
        lg: "gap-2 rounded-[14px] px-6 py-3.75 text-base",
        icon: "size-9 rounded-[12px]",
        // Alias — dialog.tsx/sheet.tsx vendorizados usam size="icon-sm" pro
        // botão de fechar (X) no canto.
        "icon-sm": "size-7 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
