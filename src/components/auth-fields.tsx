"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "children"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  variant?: "default" | "identity";
  endAdornment?: ReactNode;
};

const inputClass =
  "bg-background border-transparent focus:border-primary focus:bg-card aria-invalid:border-destructive disabled:opacity-60 w-full px-4 py-3.75 text-base outline-none focus:ring-3";

/** Porta Design/AuthFlow.tsx's Field — input com estado de foco. */
export function Field({
  label,
  value,
  onChange,
  type = "text",
  id,
  error,
  variant = "default",
  endAdornment,
  className,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div>
      <label
        htmlFor={inputId}
        className={cn(
          "font-heading text-muted-foreground mb-1.5 block font-semibold",
          variant === "identity" ? "text-xs" : "text-(length:--text-caption)",
        )}
      >
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={
            [props["aria-describedby"], error ? errorId : undefined].filter(Boolean).join(" ") ||
            undefined
          }
          className={cn(
            inputClass,
            variant === "identity"
              ? "focus:ring-ring/20 rounded-md border transition-colors"
              : "focus:ring-primary/10 rounded-2xl border-(length:--control-border-width) transition-all",
            className,
          )}
        />
        {endAdornment}
      </div>
      {error && (
        <p id={errorId} className="text-destructive mt-1.5 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

type PasswordFieldProps = Omit<FieldProps, "type" | "endAdornment">;

/** Porta Design/AuthFlow.tsx's PasswordField — com toggle de mostrar/ocultar. */
export function PasswordField({
  label,
  id,
  className,
  variant = "default",
  ...props
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      id={inputId}
      label={label}
      variant={variant}
      type={show ? "text" : "password"}
      placeholder="••••••••"
      className={cn("pr-12", className)}
      endAdornment={
        <button
          type="button"
          aria-label={`${show ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
          aria-pressed={show}
          aria-controls={inputId}
          disabled={props.disabled}
          onClick={() => setShow((s) => !s)}
          className={cn(
            "focus-visible:ring-ring absolute top-1/2 flex -translate-y-1/2 rounded-sm outline-none focus-visible:ring-2 disabled:opacity-60",
            variant === "identity"
              ? "text-muted-foreground right-3 p-2"
              : "text-gray-3 right-3.5 p-1",
          )}
        >
          {show ? (
            <EyeOff aria-hidden className={variant === "identity" ? "size-4" : "size-4.5"} />
          ) : (
            <Eye aria-hidden className={variant === "identity" ? "size-4" : "size-4.5"} />
          )}
        </button>
      }
    />
  );
}
