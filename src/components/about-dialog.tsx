"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import cybIcon from "@/assets/images/icon-check-your-breath.png";
import agesLogo from "@/assets/images/logo-ages.png";
import halityLogo from "@/assets/images/logo-hality.png";

const CREDITS = [
  "Igor Marcel",
  "Thiago Cardoso",
  "Thales Xavier",
  "Paulo Augusto",
  "Arthur Blasi",
  "Arthur Mello",
  "Eduardo Alcaria",
  "Henrique Juchem",
  "Alice Koepp",
  "Lucas Gaelzer",
  "João Pedro Ayache",
  "Március Moraes",
  "Luca Mandelli",
  "Raul Yugueros",
  "Augusto Andrade",
  "Vicenzo Marramarco",
];
const ADVISOR = "Michael Móra";

type AboutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Porta Design/'s AboutModal (byte-idêntico em PatientApp/ProfessionalApp/
 * AdminApp) — home única, compartilhada entre os 3 perfis.
 */
export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sobre</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4.5">
          <div className="text-center">
            <Image
              src={cybIcon}
              alt="Check Your Breath"
              className="mx-auto mb-2.5 h-14 w-auto object-contain"
            />
            <div className="font-heading text-[17px] font-black text-[var(--color-teal-900)]">
              Check <span className="text-[var(--color-teal-700)]">Your</span> Breath
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs">v1.0.0 · Protótipo</div>
          </div>

          <p className="text-muted-foreground text-[13px] leading-relaxed">
            O Check Your Breath é um app de pré-diagnóstico de halitose desenvolvido em parceria com
            a Hality, como projeto da disciplina AGES (Agência Experimental de Engenharia de
            Software) da PUCRS. A proposta é facilitar o acesso a uma triagem inicial do hálito com
            apoio de inteligência artificial, conectando pacientes a profissionais especializados
            para confirmação clínica.
          </p>

          <div className="text-center">
            <Image
              src={agesLogo}
              alt="AGES — Agência Experimental de Engenharia de Software"
              className="mx-auto mb-3 h-6.5 w-auto object-contain"
            />
            <div className="mb-2.5 flex flex-wrap justify-center gap-1.5">
              {CREDITS.map((name) => (
                <span
                  key={name}
                  className="font-heading bg-background rounded-4xl px-3 py-1.5 text-xs font-semibold"
                >
                  {name}
                </span>
              ))}
            </div>
            <div className="bg-secondary flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5">
              <span className="font-heading text-primary text-[13px] font-bold">{ADVISOR}</span>
              <span className="text-primary text-[11px]">· Professor orientador</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Image src={halityLogo} alt="Hality" className="h-4 w-auto object-contain opacity-60" />
            <span className="text-gray-3 text-[11px]">em parceria com Hality</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
