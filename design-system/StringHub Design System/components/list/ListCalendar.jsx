import React from "react";
const STATE_COLORS = { open: "#94A3B8", "in-progress": "#F59E0B", "on-hold": "#6366F1", resolved: "#10B981", closed: "#374151" };
/** Month calendar of dated items (tickets, tasks…), Monday first. days: 35/42 cells [{label, other?, today?, items:[{subject, state|color}], more?}]. */
export function ListCalendar({ title = "September 2026", field = "Created", days = [], warning, onOpen, newLabel = "New Item" }) {
  return <div className="tk-cal">
    <div className="tk-cal-head">
      <div><span className="tk-cal-nav"><button type="button" aria-label="Previous"><i className="bx bx-chevron-left" aria-hidden="true"></i></button><button type="button" aria-label="Next"><i className="bx bx-chevron-right" aria-hidden="true"></i></button></span><h2 className="tk-cal-title">{title}</h2></div>
      <div><button type="button" className="btn-cb" title="Lay items out by date field"><i className="bx bx-time-five" aria-hidden="true"></i> {field} <i className="bx bx-chevron-down" aria-hidden="true"></i></button><button type="button" className="tk-today">Today</button><button type="button" className="btn-cb">Options <i className="bx bx-chevron-down" aria-hidden="true"></i></button></div>
    </div>
    {warning ? <div className="tk-cal-warn"><i className="bx bx-info-circle" aria-hidden="true"></i> {warning}</div> : null}
    <div className="tk-cal-scroll">
      <div className="tk-cal-days">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="tk-cal-grid">{days.map((d, i) => <div key={i} className={"tk-day" + (d.other ? " other" : "") + (d.today ? " today" : "")}>
        <div className="tk-day-top"><button type="button" className="tk-day-add"><i className="bx bx-plus" aria-hidden="true"></i> {newLabel}</button><span className={"tk-date" + (String(d.label).length > 2 ? " wide" : "")}>{d.label}</span></div>
        <div className="tk-day-list">{(d.items || []).map((t, j) => <button key={j} type="button" className="tk-chip" style={{ "--c": t.color || STATE_COLORS[t.state] }} title={t.subject} onClick={() => onOpen && onOpen(t)}><span>{t.subject}</span><i className="bx bx-dots-horizontal-rounded tk-chip-menu" aria-hidden="true"></i></button>)}
          {d.more ? <button type="button" className="tk-cal-more">Load more ({d.more} more)</button> : null}</div>
      </div>)}</div>
    </div>
  </div>;
}
