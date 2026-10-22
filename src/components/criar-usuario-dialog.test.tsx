import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CriarUsuarioDialog } from "@/components/criar-usuario-dialog";

afterEach(cleanup);
it("cria convite sem senha/token e valida o e-mail", () => {
  const onCreate = vi.fn();
  render(<CriarUsuarioDialog open onOpenChange={vi.fn()} onCreate={onCreate} />);
  expect(screen.queryByLabelText(/Senha/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Gerar/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: " Pessoa " } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "inválido" } });
  expect(screen.getByRole("button", { name: "Criar e convidar" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "pessoa@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Criar e convidar" }));
  expect(onCreate).toHaveBeenCalledWith({
    nome: "Pessoa",
    email: "pessoa@example.com",
    telefone: "",
    role: "paciente",
  });
});

it("distingue o ambiente de demonstração de envio real", () => {
  render(<CriarUsuarioDialog open demonstracao onOpenChange={vi.fn()} onCreate={vi.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent("nenhum e-mail será enviado");
});
