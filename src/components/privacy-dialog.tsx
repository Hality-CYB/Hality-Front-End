"use client";

import { useState } from "react";
import { Download, Mail, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/alert";
import {
  CaixaDeConsentimento,
  LinkDoTermo,
  useLeituraDeTermos,
} from "@/components/caixas-de-termos";
import type {
  DecisaoConsentimento,
  EstadoConsentimento,
  TermoConsentimento,
} from "@/types/consentimento";
import { formatarData } from "@/lib/datas";

type PrivacyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termos: TermoConsentimento[];
  estados: EstadoConsentimento[];
  carregando: boolean;
  erroCarregar: boolean;
  onTentarDeNovo: () => void;
  onDecidir: (decisao: DecisaoConsentimento) => void;
  salvando: boolean;
  erroDecisao: string | null;
};

function descricaoDoEstado(estado: EstadoConsentimento): string {
  if (estado.requerDecisao && estado.aceito !== null) {
    return "O termo foi atualizado. Precisa da sua decisão de novo.";
  }
  if (estado.aceito === null) return "Você ainda não decidiu.";
  const quando = estado.decididoEm ? ` em ${formatarData(estado.decididoEm)}` : "";
  return estado.vigente ? `Aceito${quando}.` : `Não aceito${quando}.`;
}

/** Ação que ainda não existe no back: visível, mas sem fingir que funciona. */
function EmBreve({ Icon, label }: { Icon: typeof Mail; label: string }) {
  return (
    <div
      className="bg-background text-muted-foreground flex items-center justify-between gap-3 rounded-xl p-3.5 opacity-70"
      aria-disabled
    >
      <span className="flex items-center gap-2 text-[13px] font-semibold">
        <Icon className="h-4 w-4" aria-hidden /> {label}
      </span>
      <span className="text-[11px] font-bold">Em breve</span>
    </div>
  );
}

/**
 * Privacidade do paciente: consentimentos por finalidade lidos e gravados no
 * back (`/users/me/consentimentos`, US-020). Ligar ou desligar registra um
 * novo evento (o histórico fica no back). Revogar dados de saúde bloqueia
 * novos diagnósticos, então pede confirmação.
 */
export function PrivacyDialog({
  open,
  onOpenChange,
  termos,
  estados,
  carregando,
  erroCarregar,
  onTentarDeNovo,
  onDecidir,
  salvando,
  erroDecisao,
}: PrivacyDialogProps) {
  const [confirmarRevogacao, setConfirmarRevogacao] = useState(false);
  const leitura = useLeituraDeTermos();

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmarRevogacao(false);
    onOpenChange(next);
  }

  function decidir(estado: EstadoConsentimento, aceitar: boolean) {
    if (!aceitar && estado.obrigatorio) {
      setConfirmarRevogacao(true);
      return;
    }
    onDecidir({ finalidade: estado.finalidade, versao: estado.versaoVigente, aceito: aceitar });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Privacidade</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Decida como seus dados podem ser usados. Você pode mudar quando quiser.
          </p>

          {carregando && (
            <p className="text-muted-foreground text-sm" role="status">
              Carregando…
            </p>
          )}
          {erroCarregar && (
            <div className="flex flex-col items-start gap-2">
              <Alert message="Não foi possível carregar seus consentimentos." />
              <Button size="sm" variant="secondary" onClick={onTentarDeNovo}>
                Tentar de novo
              </Button>
            </div>
          )}

          {estados.map((estado) => {
            const termo = termos.find((t) => t.finalidade === estado.finalidade);
            const titulo = termo?.titulo ?? estado.finalidade;
            return (
              <div
                key={estado.finalidade}
                className="bg-background flex flex-col gap-2 rounded-xl p-3.5"
              >
                {termo ? (
                  <CaixaDeConsentimento
                    termo={termo}
                    marcada={estado.vigente}
                    onMudar={(aceitar) => decidir(estado, aceitar)}
                    onLer={leitura.abrir}
                    desabilitada={salvando}
                  />
                ) : (
                  <span className="font-heading text-[13px] font-bold">{titulo}</span>
                )}
                <div className="text-muted-foreground pl-6.5 text-xs">
                  {descricaoDoEstado(estado)}
                </div>
                {estado.obrigatorio && confirmarRevogacao && (
                  <div className="flex flex-col gap-2.5 rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3.5">
                    <span className="text-[13px] leading-relaxed text-[#991B1B]">
                      Sem este consentimento você não consegue fazer novos diagnósticos. Os que você
                      já fez continuam guardados. Revogar mesmo assim?
                    </span>
                    <div className="flex gap-2.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setConfirmarRevogacao(false)}
                      >
                        Manter
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setConfirmarRevogacao(false);
                          onDecidir({
                            finalidade: estado.finalidade,
                            versao: estado.versaoVigente,
                            aceito: false,
                          });
                        }}
                      >
                        Revogar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {erroDecisao && <Alert message={erroDecisao} />}

          <p className="text-muted-foreground border-border border-t pt-3.5 text-[13px]">
            Leia os{" "}
            <LinkDoTermo onAbrir={() => leitura.abrir({ tipo: "uso" })}>Termos de Uso</LinkDoTermo>{" "}
            e a{" "}
            <LinkDoTermo onAbrir={() => leitura.abrir({ tipo: "privacidade" })}>
              Política de Privacidade
            </LinkDoTermo>
            .
          </p>

          {/* Fora do escopo do back por enquanto: ficam visíveis, mas desativadas. */}
          <div className="flex flex-col gap-2">
            <EmBreve Icon={Mail} label="Comunicações por e-mail" />
            <EmBreve Icon={Download} label="Baixar meus dados" />
            <EmBreve Icon={Trash2} label="Excluir minha conta" />
          </div>
        </div>
      </DialogContent>
      {leitura.dialogo}
    </Dialog>
  );
}
