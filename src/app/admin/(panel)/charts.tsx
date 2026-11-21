"use client";

import { useState } from "react";

/**
 * Small hand-built SVG charts (no chart library to keep the bundle lean).
 * Rules followed: one axis per chart, thin marks, recessive grid, text in ink
 * colours (never the series colour), hover tooltip on every chart.
 */
const SERIES = "#2F4A2A"; // brand pistachio: single-series colour
const GRID = "#E6E1D6";
const MUTED = "#6F675E";

export function TrendChart({ points, label, kind = "number" }: { points: { date: string; value: number }[]; label: string; kind?: "number" | "rupees" }) {
  // Functions can't be passed from server components, so the format is chosen by name.
  const format = (v: number) =>
    kind === "rupees"
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)
      : v.toLocaleString("en-IN");
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 200;
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const niceMax = niceCeil(max);
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const ticks = [0, niceMax / 2, niceMax];
  const labelEvery = Math.ceil(points.length / 6);
  const h = hover !== null ? points[hover] : null;

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${label} per day`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={MUTED}>
              {compact(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill={MUTED}>
              {shortDate(p.date)}
            </text>
          ) : null
        )}
        <path d={path} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {h && hover !== null ? (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke={MUTED} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.value)} r={4.5} fill={SERIES} stroke="#fff" strokeWidth={2} />
          </>
        ) : null}
      </svg>
      {h && hover !== null ? (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-paper-line bg-white px-3 py-1.5 text-sm shadow-sm"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > points.length / 2 ? "-105%" : "5%"})` }}
        >
          <span className="text-ink-mute">{shortDate(h.date)}</span> <strong className="rate-num">{format(h.value)}</strong>
        </div>
      ) : null}
      <details className="mt-1 text-sm text-ink-soft">
        <summary className="cursor-pointer">Show as table</summary>
        <table className="rate-num mt-2 w-full max-w-xs">
          <tbody>
            {points.map((p) => (
              <tr key={p.date}>
                <td>{p.date}</td>
                <td className="text-right">{format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal bars with the value written at the end: for rankings. */
export function BarList({ rows }: { rows: { label: string; value: number; note?: string }[] }) {
  const format = (v: number) => v.toLocaleString("en-IN");
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-ink-mute">No data yet for this period.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}${r.note ? ` · ${r.note}` : ""}`}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate text-ink">{r.label}</span>
            <span className="rate-num shrink-0 text-ink-soft">
              {format(r.value)}
              {r.note ? <span className="ml-2 text-ink-mute">{r.note}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-paper">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Conversion funnel: each step as a bar relative to the first, with drop-off between steps. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].value : 0;
        const stepRate = i && prev ? s.value / prev : null;
        return (
          <li key={s.label}>
            <div className="flex justify-between gap-3 text-sm">
              <span>{s.label}</span>
              <span className="rate-num text-ink-soft">
                <strong className="text-ink">{s.value.toLocaleString("en-IN")}</strong>
                {stepRate !== null ? <span className="ml-2 text-ink-mute">{(stepRate * 100).toFixed(0)}% of previous</span> : null}
              </span>
            </div>
            <div className="mt-1 h-6 rounded bg-paper">
              <div className="h-6 rounded" style={{ width: `${Math.max(1.5, (s.value / top) * 100)}%`, background: SERIES, opacity: 1 - i * 0.12 }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** 24 vertical bars: visits by hour of day (India time). */
export function HourBars({ hours }: { hours: { hour: number; sessions: number; orders: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...hours.map((h) => h.sessions));
  const h = hover !== null ? hours[hover] : null;
  return (
    <div>
      <div className="flex h-32 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
        {hours.map((x, i) => (
          <button
            key={x.hour}
            type="button"
            aria-label={`${x.hour}:00, ${x.sessions} visits, ${x.orders} orders`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            className="flex h-full flex-1 items-end"
          >
            <span
              className="block w-full rounded-t-[4px]"
              style={{ height: `${Math.max(2, (x.sessions / max) * 100)}%`, background: SERIES, opacity: hover === null || hover === i ? 1 : 0.45 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-mute">
        <span>12 am</span>
        <span>6 am</span>
        <span>12 pm</span>
        <span>6 pm</span>
        <span>11 pm</span>
      </div>
      <p className="mt-2 h-5 text-sm text-ink-soft" aria-live="polite">
        {h ? (
          <>
            {h.hour}:00–{h.hour + 1}:00 · <strong className="text-ink">{h.sessions}</strong> visits · <strong className="text-ink">{h.orders}</strong> orders
          </>
        ) : (
          "Tap or hover a bar to see visits and orders for that hour"
        )}
      </p>
    </div>
  );
}

function niceCeil(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function compact(v: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(day)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]}`;
}
