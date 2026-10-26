import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AgentFeed from "./AgentFeed";
import * as api from "../api";

describe("AgentFeed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders signals returned by the API", async () => {
    vi.spyOn(api, "getAgentFeed").mockResolvedValue([
      {
        signal_id: 1,
        agent_type: "momentum",
        source: "price action",
        symbol: "BTCUSD",
        message: "BTCUSD is showing strong upward momentum.",
        confidence: 0.8,
        timestamp: 1,
      },
    ]);

    render(<AgentFeed />);

    await waitFor(() => {
      expect(screen.getByText(/BTCUSD is showing strong upward momentum/)).toBeInTheDocument();
    });
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("shows an error message when the feed is unavailable", async () => {
    vi.spyOn(api, "getAgentFeed").mockRejectedValue(new Error("network error"));

    render(<AgentFeed />);

    await waitFor(() => {
      expect(screen.getByText("Agent feed unavailable")).toBeInTheDocument();
    });
  });
});
