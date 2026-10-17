import React from "react";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Weekday × hour heatmap. data: 7 rows × 24 numbers. businessHours: [from, to] hour. */
export function Heatmap({ data = [], businessHours = [9, 18], unit = "agent actions" }) {
  const max = Math.max(1, ...data.flat());
  const cells = [];
  data.forEach((row, d) => { cells.push(<span className="hm-y" key={"y" + d}>{DAYS[d]}</span>); row.forEach((v, h) => cells.push(<span className="hm-cell" key={d + "-" + h} style={{ "--v": +(v / max).toFixed(2) }} title={DAYS[d] + " " + String(h).padStart(2, "0") + ":00 · " + v + " " + unit}></span>)); });
  cells.push(<span key="x0"></span>);
  for (let h = 0; h < 24; h += 2) { cells.push(<span className="hm-x" key={"x" + h}>{String(h).padStart(2, "0")}</span>); cells.push(<span key={"xs" + h}></span>); }
  if (businessHours) cells.push(<span key="bh" className="hm-hours" style={{ gridColumn: (businessHours[0] + 2) + " / " + (businessHours[1] + 2), gridRow: "1 / 6" }} aria-hidden="true"></span>);
  return <div><div className="heatmap" role="img" aria-label={"Heatmap of " + unit + " by weekday and hour"}>{cells}</div>
    <div className="hm-legend"><span>0 <i className="hm-ramp"></i> {max}</span>{businessHours ? <span><i className="hm-box"></i>Business hours</span> : null}</div></div>;
}
