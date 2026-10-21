import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, PasswordField } from "@/components/auth-fields";

afterEach(cleanup);

it("mantém label, edição e propriedades nativas dos campos existentes", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <Field label="E-mail" value="" onChange={change} type="email" required autoComplete="email" />,
  );
  const input = screen.getByRole("textbox", { name: "E-mail" });
  await user.click(screen.getByText("E-mail"));
  expect(input).toHaveFocus();
  await user.type(input, "a");
  expect(change).toHaveBeenCalledWith("a");
  expect(input).toBeRequired();
  expect(input).toHaveAttribute("autocomplete", "email");
});

it("mantém a orientação acessível ao adicionar e remover um erro", () => {
  const { rerender } = render(
    <>
      <p id="orientacao">Use seu e-mail de cadastro.</p>
      <Field
        label="E-mail"
        value=""
        onChange={vi.fn()}
        aria-describedby="orientacao"
        error="Informe um e-mail válido."
      />
    </>,
  );
  const input = screen.getByRole("textbox", { name: "E-mail" });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription(
    "Use seu e-mail de cadastro. Informe um e-mail válido.",
  );
  rerender(
    <>
      <p id="orientacao">Use seu e-mail de cadastro.</p>
      <Field label="E-mail" value="" onChange={vi.fn()} aria-describedby="orientacao" />
    </>,
  );
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(input).toHaveAccessibleDescription("Use seu e-mail de cadastro.");
});

it.each(["default", "identity"] as const)(
  "mantém teclado, edição e visibilidade da senha na variante %s",
  async (variant) => {
    const user = userEvent.setup();
    const submit = vi.fn((event) => event.preventDefault());
    function Form() {
      const [value, setValue] = useState("");
      return (
        <form onSubmit={submit}>
          <PasswordField
            variant={variant}
            label="Senha"
            value={value}
            onChange={setValue}
            autoComplete="new-password"
          />
        </form>
      );
    }
    render(<Form />);
    const input = screen.getByLabelText("Senha");
    await user.type(input, "Segura123");
    expect(input).toHaveValue("Segura123");
    expect(input).toHaveAttribute("type", "password");
    await user.tab();
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-controls", input.id);
    await user.keyboard("{Enter}");
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.keyboard(" ");
    expect(input).toHaveAttribute("type", "password");
    expect(submit).not.toHaveBeenCalled();
  },
);

it("bloqueia também a alternância de visibilidade quando o campo está desabilitado", async () => {
  const user = userEvent.setup();
  render(<PasswordField label="Senha" value="Segura123" onChange={vi.fn()} disabled />);
  await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
  expect(screen.getByLabelText("Senha")).toBeDisabled();
  expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
  expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeDisabled();
});
