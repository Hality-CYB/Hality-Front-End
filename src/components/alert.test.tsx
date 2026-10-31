import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Alert } from "@/components/alert";

afterEach(cleanup);

it("mantém erro como padrão e trata a mensagem como texto", () => {
  const message = "<script>mensagem de erro</script>";
  const { container } = render(<Alert message={message} />);
  expect(screen.getByRole("alert")).toHaveTextContent(message);
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getByText("!")).toHaveAttribute("aria-hidden", "true");
});

it.each(["success", "info"] as const)(
  "preserva a mensagem e a classe do consumidor em um alerta %s",
  (type) => {
    render(<Alert type={type} message="Operação informada." className="mt-4" />);
    expect(screen.getByRole("status")).toHaveTextContent("Operação informada.");
    expect(screen.getByRole("status")).toHaveClass("mt-4");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);
