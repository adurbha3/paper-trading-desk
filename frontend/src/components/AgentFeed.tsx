import { useEffect, useState } from "react";
import type { AgentSignal } from "../api";
import { getAgentFeed } from "../api";

const POLL_INTERVAL_MS = 4000;

const AGENT_LABEL: Record<AgentSignal["agent_type"], string> = {
  momentum: "Momentum Agent",
  sentiment: "Sentiment Agent",
  anomaly: "Anomaly Agent",
};

export default function AgentFeed() {
  const [signals, setSignals] = useState<AgentSignal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const latest = await getAgentFeed(20);
        if (!cancelled) {
          setSignals(latest);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Agent feed unavailable");
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="agent-feed">
      <h3>AI Agent Signals</h3>
      {error && <p className="agent-feed-error">{error}</p>}
      <ul>
        {signals.map((signal) => (
          <li key={signal.signal_id} className={`agent-signal ${signal.agent_type}`}>
            <div className="agent-signal-header">
              <span className="agent-label">{AGENT_LABEL[signal.agent_type]}</span>
              <span className="agent-confidence">{Math.round(signal.confidence * 100)}%</span>
            </div>
            <p className="agent-message">{signal.message}</p>
            <span className="agent-source">via {signal.source}</span>
          </li>
        ))}
        {signals.length === 0 && !error && <li className="agent-signal-empty">Waiting for signals...</li>}
      </ul>
    </div>
  );
}
