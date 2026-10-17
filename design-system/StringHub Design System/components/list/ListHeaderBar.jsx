import React from "react";
const VIEWS = [["list", "list-ul", "List"], ["board", "columns", "Board"], ["calendar", "calendar", "Calendar"], ["table", "table", "Table"], ["gallery", "carousel", "Gallery"]];
/** Sticky tinted bar that opens any list page with views (tickets, tasks…): desk ▾ / title + count + search, then Mine, Spam, the view switcher, Filter, Display, Export and the New button (newLabel, default "New Item"). conversation = the Conversation route (indigo accent). */
export function ListHeaderBar({ desk = "Support", title, count, view = "list", onViewChange, conversation, spam = "Active", newLabel = "New Item", onNew, onFilter, onDisplay, onExport }) {
  const t = title || (conversation ? "Conversation" : "List");
  return <div className={conversation ? "tk-conv-route" : ""}><div className="tk-headbar">
    <div className="tk-crumbs">
      <i className="bx bx-support" style={{ "--c": "#7E7BDE" }} aria-hidden="true"></i>
      <button type="button" className="tk-desk">{desk} <i className="bx bx-chevron-down" aria-hidden="true"></i></button>
      <span className="tk-slash">/</span>
      <h1 className="tk-title"><i className={"bx " + (conversation ? "bx-conversation" : "bx-receipt")} aria-hidden="true"></i> {t}</h1>
      {count != null ? <span className="tk-count">{count}</span> : null}
      <button type="button" className="tk-search-btn" aria-label="Search"><i className="bx bx-search" aria-hidden="true"></i></button>
    </div>
    <div className="tk-tools">
      <button type="button" className="tk-mine" title="Mine" aria-label="Assigned to me"><span className="tk-avatar c1">P</span></button>
      <button type="button" className="tk-spam"><small>Spam:</small> {spam} <i className="bx bx-chevron-down" aria-hidden="true"></i></button>
      <div className="tk-views" role="group" aria-label="Layout">
        {VIEWS.map(([v, ic, l]) => <button key={v} type="button" data-view={v} className={v === view ? "active" : ""} aria-pressed={v === view} title={l} aria-label={l + " view"} onClick={() => onViewChange && onViewChange(v)}><i className={"bx bx-" + ic} aria-hidden="true"></i></button>)}
      </div>
      <button type="button" className="btn-cb icon" title="Filter" aria-label="Filter" onClick={onFilter}><i className="bx bx-filter" aria-hidden="true"></i></button>
      <button type="button" className="btn-cb icon" title="Display" aria-label="Display" onClick={onDisplay}><i className="bx bx-slider-alt" aria-hidden="true"></i></button>
      <button type="button" className="btn-cb icon" title="Export" aria-label="Export" onClick={onExport}><i className="bx bx-download" aria-hidden="true"></i></button>
      <button type="button" className="btn btn-custom-primary tk-new" onClick={onNew}><i className="bx bx-plus" aria-hidden="true"></i> {newLabel}</button>
    </div>
  </div></div>;
}
