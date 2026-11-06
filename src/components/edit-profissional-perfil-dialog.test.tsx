import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  EditProfissionalPerfilDialog,
  type PerfilProfissional,
} from "@/components/edit-profissional-perfil-dialog";

afterEach(cleanup);

const salvo: PerfilProfissional = {
  nome: "Dra. Ana",
  telefone: "11999990000",
  especialidade: "Odontologia",
  registro: "CRO-SP 123456",
};

function PaginaQueAbrePelaPropOpen({ initial }: { initial: PerfilProfissional }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)}>Abrir</button>
      <EditProfissionalPerfilDialog
        open={aberto}
        onOpenChange={setAberto}
        initial={initial}
        onSave={vi.fn()}
      />
    </>
  );
}

it("volta aos valores salvos ao reabrir depois de fechar sem salvar", () => {
  render(<PaginaQueAbrePelaPropOpen initial={salvo} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "DESCARTADO" } });
  fireEvent.change(screen.getByLabelText("Registro profissional"), {
    target: { value: "DESC-9" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
  expect(screen.getByLabelText("Nome")).toHaveValue("Dra. Ana");
  expect(screen.getByLabelText("Telefone")).toHaveValue("11999990000");
  expect(screen.getByLabelText("Especialidade")).toHaveValue("Odontologia");
  expect(screen.getByLabelText("Registro profissional")).toHaveValue("CRO-SP 123456");
});

it("mostra os valores salvos mais recentes quando eles mudam com o dialog fechado", () => {
  const { rerender } = render(<PaginaQueAbrePelaPropOpen initial={{ ...salvo, nome: "" }} />);
  rerender(<PaginaQueAbrePelaPropOpen initial={salvo} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
  expect(screen.getByLabelText("Nome")).toHaveValue("Dra. Ana");
  expect(screen.getByLabelText("Especialidade")).toHaveValue("Odontologia");
});
