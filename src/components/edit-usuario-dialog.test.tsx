import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EditUsuarioDialog } from "@/components/edit-usuario-dialog";
import type { Usuario } from "@/types/usuario";

afterEach(cleanup);

const salvo = {
  id: "u1",
  nome: "Dr. Marcelo",
  email: "admin@hality.com",
  telefone: "11999990000",
  role: "admin",
} as Usuario;

function PaginaQueAbrePelaPropOpen({ usuario }: { usuario: Usuario }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)}>Abrir</button>
      <EditUsuarioDialog
        open={aberto}
        onOpenChange={setAberto}
        usuario={usuario}
        onSave={vi.fn()}
      />
    </>
  );
}

it("volta aos valores salvos ao reabrir depois de fechar sem salvar", () => {
  render(<PaginaQueAbrePelaPropOpen usuario={salvo} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "DESCARTADO" } });
  fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "99999" } });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
  expect(screen.getByLabelText("Nome")).toHaveValue("Dr. Marcelo");
  expect(screen.getByLabelText("Telefone")).toHaveValue("11999990000");
});

it("mostra os valores salvos mais recentes quando eles mudam com o dialog fechado", () => {
  const { rerender } = render(
    <PaginaQueAbrePelaPropOpen usuario={{ ...salvo, nome: "Antigo", telefone: null }} />,
  );
  rerender(<PaginaQueAbrePelaPropOpen usuario={salvo} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
  expect(screen.getByLabelText("Nome")).toHaveValue("Dr. Marcelo");
  expect(screen.getByLabelText("Telefone")).toHaveValue("11999990000");
});
