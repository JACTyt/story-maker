// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VariantCard } from "./VariantCard";

describe("VariantCard", () => {
  it("reports a checkbox toggle via onChange", async () => {
    const onChange = vi.fn();
    render(
      <VariantCard
        variant={{ name: "Mira", description: "A smuggler", checked: false }}
        nameLabel="Name"
        onChange={onChange}
      />
    );

    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith({ name: "Mira", description: "A smuggler", checked: true });
  });

  it("reports a name edit via onChange", () => {
    const onChange = vi.fn();
    render(
      <VariantCard
        variant={{ name: "Mira", description: "A smuggler", checked: false }}
        nameLabel="Name"
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByDisplayValue("Mira"), { target: { value: "Zara" } });
    expect(onChange).toHaveBeenCalledWith({ name: "Zara", description: "A smuggler", checked: false });
  });
});
