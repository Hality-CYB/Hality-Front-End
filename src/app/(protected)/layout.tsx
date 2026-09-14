import { BottomNav } from "@/components/layout/bottom-nav";

export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="bg-background mx-auto flex h-dvh w-full max-w-120 flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <BottomNav role="paciente" />
    </div>
  );
}
