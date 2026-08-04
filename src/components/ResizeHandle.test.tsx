// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResizeHandle } from "./ResizeHandle";

describe("ResizeHandle", () => {
  it("calls onResize with the pointer delta while dragging", () => {
    const onResize = vi.fn();
    render(<ResizeHandle onResize={onResize} />);
    const handle = screen.getByRole("separator");

    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 130 });
    expect(onResize).toHaveBeenCalledWith(30);

    fireEvent.mouseMove(window, { clientX: 150 });
    expect(onResize).toHaveBeenCalledWith(20);

    fireEvent.mouseUp(window);
    fireEvent.mouseMove(window, { clientX: 200 });
    expect(onResize).toHaveBeenCalledTimes(2);
  });
});
