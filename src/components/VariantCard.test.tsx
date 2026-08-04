// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VariantCard } from "./VariantCard";

const DESCRIPTION_FIELD = [{ key: "description", label: "Description" }];

describe("VariantCard", () => {
  it("reports a checkbox toggle via onChange", async () => {
    const onChange = vi.fn();
    render(
      <VariantCard
        variant={{ name: "Mira", checked: false, values: { description: "A smuggler" } }}
        nameLabel="Name"
        fields={DESCRIPTION_FIELD}
        onChange={onChange}
      />
    );

    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith({ name: "Mira", checked: true, values: { description: "A smuggler" } });
  });

  it("reports a name edit via onChange", () => {
    const onChange = vi.fn();
    render(
      <VariantCard
        variant={{ name: "Mira", checked: false, values: { description: "A smuggler" } }}
        nameLabel="Name"
        fields={DESCRIPTION_FIELD}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByDisplayValue("Mira"), { target: { value: "Zara" } });
    expect(onChange).toHaveBeenCalledWith({ name: "Zara", checked: false, values: { description: "A smuggler" } });
  });

  it("renders multiple fields and reports edits to the right key", () => {
    const onChange = vi.fn();
    render(
      <VariantCard
        variant={{ name: "Mira", checked: false, values: { appearance: "Scar", personality: "Guarded" } }}
        nameLabel="Name"
        fields={[
          { key: "appearance", label: "Appearance" },
          { key: "personality", label: "Personality" },
        ]}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByDisplayValue("Guarded"), { target: { value: "Reformed" } });
    expect(onChange).toHaveBeenCalledWith({
      name: "Mira",
      checked: false,
      values: { appearance: "Scar", personality: "Reformed" },
    });
  });
});
