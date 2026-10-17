import React from "react";
/** Month grid. cells: [{num, outside, today, events:[{label, tone}], more}] (35 or 42 cells). */
export function CalendarView({ month, cells = [], range = "Month", onRange, onPrev, onNext, onToday }) {
  return <div className="calendar-view">
    <div className="calendar-toolbar"><button className="btn btn-secondary btn-sm" onClick={onToday}>Today</button>
      <button className="btn btn-ghost btn-icon btn-sm" aria-label="Previous month" onClick={onPrev}><i className="bx bx-chevron-left icon-14" aria-hidden="true"></i></button>
      <button className="btn btn-ghost btn-icon btn-sm" aria-label="Next month" onClick={onNext}><i className="bx bx-chevron-right icon-14" aria-hidden="true"></i></button>
      <span className="cal-month">{month}</span><div className="spacer"></div>
      <div className="seg" role="group" aria-label="Calendar range" style={{ width: 200 }}>{["Week", "Month"].map((r) => <button key={r} className={"seg-btn" + (r === range ? " is-on" : "")} aria-pressed={r === range} onClick={() => onRange && onRange(r)}>{r}</button>)}</div></div>
    <div className="calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}</div>
    <div className="calendar-days">{cells.map((c, i) => <div key={i} className={"calendar-cell" + (c.outside ? " outside" : "") + (c.today ? " today" : "")} aria-current={c.today ? "date" : undefined}>
      <span className="cal-num">{c.num}</span>{(c.events || []).slice(0, 2).map((e, j) => <a key={j} className={"calendar-event" + (e.tone ? " " + e.tone : "")} href="#" onClick={(ev) => ev.preventDefault()}>{e.label}</a>)}
      {(c.events || []).length > 2 || c.more ? <button className="calendar-more">+{c.more ?? c.events.length - 2} more</button> : null}</div>)}</div>
  </div>;
}
