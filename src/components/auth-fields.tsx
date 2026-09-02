"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
};

/** Porta Design/AuthFlow.tsx's Field — input com estado de foco. */
export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="font-heading text-muted-foreground mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-2xl border-[1.5px] px-4 py-3.75 text-base transition-all outline-none"
        style={{
          background: focused ? "var(--card)" : "var(--background)",
          borderColor: focused ? "var(--primary)" : "transparent",
          boxShadow: focused ? "0 0 0 3px rgba(11,107,130,0.10)" : "none",
        }}
      />
    </div>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
};

/** Porta Design/AuthFlow.tsx's PasswordField — com toggle de mostrar/ocultar. */
export function PasswordField({ label, value, onChange, autoComplete }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="font-heading text-muted-foreground mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-2xl border-[1.5px] py-3.75 pr-12 pl-4 text-base transition-all outline-none"
          style={{
            background: focused ? "var(--card)" : "var(--background)",
            borderColor: focused ? "var(--primary)" : "transparent",
            boxShadow: focused ? "0 0 0 3px rgba(11,107,130,0.10)" : "none",
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-gray-3 absolute top-1/2 right-3.5 flex -translate-y-1/2 p-1"
        >
          {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
    </div>
  );
}
