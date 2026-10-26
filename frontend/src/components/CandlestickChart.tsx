import { useMemo, useState } from "react";
import type { Candle, Timeframe } from "../api";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "1h", "1d"];
const CHART_WIDTH = 760;
const CHART_HEIGHT = 360;
const MARGIN = { top: 12, right: 60, bottom: 24, left: 8 };

type LevelKind = "entry" | "target" | "stop";

const LEVEL_COLOR: Record<LevelKind, string> = {
  entry: "var(--level-entry)",
  target: "var(--level-target)",
  stop: "var(--level-stop)",
};

interface CandlestickChartProps {
  symbol: string;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export default function CandlestickChart({
  symbol,
  candles,
  timeframe,
  onTimeframeChange,
}: CandlestickChartProps) {
  const [levels, setLevels] = useState<Record<LevelKind, number | null>>({
    entry: null,
    target: null,
    stop: null,
  });
  const [activeLevel, setActiveLevel] = useState<LevelKind>("entry");

  const { innerHeight, priceToY, candleSlots } = useMemo(() => {
    const innerWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

    if (candles.length === 0) {
      return {
        innerWidth,
        innerHeight,
        priceToY: () => MARGIN.top,
        candleSlots: [] as { candle: Candle; x: number; width: number }[],
      };
    }

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const maxPrice = Math.max(...highs, ...Object.values(levels).filter((v): v is number => v != null));
    const minPrice = Math.min(...lows, ...Object.values(levels).filter((v): v is number => v != null));
    const padding = (maxPrice - minPrice) * 0.08 || 1;
    const top = maxPrice + padding;
    const bottom = minPrice - padding;

    const priceToY = (price: number) =>
      MARGIN.top + ((top - price) / (top - bottom)) * innerHeight;

    const slotWidth = innerWidth / candles.length;
    const candleSlots = candles.map((candle, i) => ({
      candle,
      x: MARGIN.left + i * slotWidth,
      width: slotWidth,
    }));

    return { innerWidth, innerHeight, priceToY, candleSlots };
  }, [candles, levels]);

  function handleChartClick(event: React.MouseEvent<SVGSVGElement>) {
    if (candles.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleY = CHART_HEIGHT / rect.height;
    const y = (event.clientY - rect.top) * scaleY;

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const maxPrice = Math.max(...highs);
    const minPrice = Math.min(...lows);
    const padding = (maxPrice - minPrice) * 0.08 || 1;
    const top = maxPrice + padding;
    const bottom = minPrice - padding;

    const price = top - ((y - MARGIN.top) / innerHeight) * (top - bottom);
    setLevels((prev) => ({ ...prev, [activeLevel]: Math.round(price * 100) / 100 }));
  }

  return (
    <div className="candlestick-chart">
      <div className="chart-header">
        <h2>{symbol}</h2>
        <div className="timeframe-buttons" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              className={tf === timeframe ? "active" : ""}
              onClick={() => onTimeframeChange(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="level-controls" role="group" aria-label="Trade levels">
        {(["entry", "target", "stop"] as LevelKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            className={kind === activeLevel ? "active" : ""}
            style={{ borderColor: LEVEL_COLOR[kind] }}
            onClick={() => setActiveLevel(kind)}
          >
            {kind} {levels[kind] != null ? `· ${levels[kind]!.toFixed(2)}` : ""}
          </button>
        ))}
        <button
          type="button"
          className="clear-levels"
          onClick={() => setLevels({ entry: null, target: null, stop: null })}
        >
          clear
        </button>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        role="img"
        aria-label={`${symbol} candlestick chart, click to mark the ${activeLevel} price`}
        onClick={handleChartClick}
      >
        {candleSlots.map(({ candle, x, width }) => {
          const isUp = candle.close >= candle.open;
          const bodyTop = priceToY(Math.max(candle.open, candle.close));
          const bodyBottom = priceToY(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
          const centerX = x + width / 2;
          const bodyWidth = Math.max(width * 0.6, 1);

          return (
            <g key={candle.timestamp} data-testid="candle">
              <line
                x1={centerX}
                x2={centerX}
                y1={priceToY(candle.high)}
                y2={priceToY(candle.low)}
                stroke={isUp ? "var(--candle-up)" : "var(--candle-down)"}
                strokeWidth={1}
              />
              <rect
                x={centerX - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={isUp ? "var(--candle-up)" : "var(--candle-down)"}
              />
            </g>
          );
        })}

        {(["entry", "target", "stop"] as LevelKind[]).map((kind) => {
          const price = levels[kind];
          if (price == null) return null;
          const y = priceToY(price);
          return (
            <g key={kind} data-testid={`level-${kind}`}>
              <line
                x1={MARGIN.left}
                x2={CHART_WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                stroke={LEVEL_COLOR[kind]}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text x={CHART_WIDTH - MARGIN.right + 6} y={y + 4} fontSize={11} fill={LEVEL_COLOR[kind]}>
                {price.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
