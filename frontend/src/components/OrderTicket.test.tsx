import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OrderTicket from "./OrderTicket";
import type { OrderResponse, Position } from "../api";

const POSITION: Position = {
  symbol: "AAPL",
  quantity: 10,
  avg_price: 150,
  buying_power: 5000,
  buy_presets: { "25%": 8.33, "50%": 16.67, "75%": 25, "100%": 33.33 },
  sell_presets: { "25%": 2.5, "50%": 5, "75%": 7.5, "100%": 10 },
};

function filledResponse(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    order_id: 1,
    symbol: "AAPL",
    side: "buy",
    quantity: 5,
    price: 200,
    status: "filled",
    rejection_reason: null,
    ...overrides,
  };
}

describe("OrderTicket", () => {
  it("shows buy presets by default and switches to sell presets", async () => {
    const user = userEvent.setup();
    render(
      <OrderTicket symbol="AAPL" latestPrice={200} position={POSITION} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "100%" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sell" }));
    const quantityInput = screen.getByLabelText("Quantity") as HTMLInputElement;
    await user.click(screen.getByRole("button", { name: "100%" }));
    expect(quantityInput.value).toBe("10");
  });

  it("submits the entered quantity and side", async () => {
    const onSubmit = vi.fn().mockResolvedValue(filledResponse());
    const user = userEvent.setup();
    render(
      <OrderTicket symbol="AAPL" latestPrice={200} position={POSITION} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText("Quantity"), "5");
    await user.click(screen.getByRole("button", { name: "Buy AAPL" }));

    expect(onSubmit).toHaveBeenCalledWith("buy", 5);
    expect(await screen.findByText(/Filled 5 AAPL at 200.00/)).toBeInTheDocument();
  });

  it("does not submit a non-positive quantity", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <OrderTicket symbol="AAPL" latestPrice={200} position={POSITION} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText("Quantity"), "0");
    await user.click(screen.getByRole("button", { name: "Buy AAPL" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the rejection reason when the order is rejected", async () => {
    const onSubmit = vi.fn().mockResolvedValue(
      filledResponse({ status: "rejected", rejection_reason: "insufficient buying power" }),
    );
    const user = userEvent.setup();
    render(
      <OrderTicket symbol="AAPL" latestPrice={200} position={POSITION} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText("Quantity"), "999");
    await user.click(screen.getByRole("button", { name: "Buy AAPL" }));

    expect(await screen.findByText(/Rejected: insufficient buying power/)).toBeInTheDocument();
  });
});
