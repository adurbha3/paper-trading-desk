import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CandlestickChart from "./CandlestickChart";
import type { Candle } from "../api";

const CANDLES: Candle[] = [
  { timestamp: 0, open: 100, high: 105, low: 98, close: 102, volume: 10 },
  { timestamp: 1, open: 102, high: 110, low: 101, close: 108, volume: 20 },
  { timestamp: 2, open: 108, high: 109, low: 95, close: 97, volume: 15 },
];

describe("CandlestickChart", () => {
  it("renders one candle body per data point", () => {
    render(
      <CandlestickChart symbol="AAPL" candles={CANDLES} timeframe="5m" onTimeframeChange={() => {}} />,
    );
    expect(screen.getAllByTestId("candle")).toHaveLength(CANDLES.length);
  });

  it("calls onTimeframeChange when a timeframe button is clicked", async () => {
    const onTimeframeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CandlestickChart symbol="AAPL" candles={CANDLES} timeframe="5m" onTimeframeChange={onTimeframeChange} />,
    );
    await user.click(screen.getByRole("button", { name: "1h" }));
    expect(onTimeframeChange).toHaveBeenCalledWith("1h");
  });

  it("marks the active level control and renders no level lines until clicked", () => {
    render(
      <CandlestickChart symbol="AAPL" candles={CANDLES} timeframe="5m" onTimeframeChange={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /entry/i })).toHaveClass("active");
    expect(screen.queryByTestId("level-entry")).not.toBeInTheDocument();
  });

  it("switches the active level when a different level button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <CandlestickChart symbol="AAPL" candles={CANDLES} timeframe="5m" onTimeframeChange={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: /^target/i }));
    expect(screen.getByRole("button", { name: /^target/i })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /^entry/i })).not.toHaveClass("active");
  });
});
