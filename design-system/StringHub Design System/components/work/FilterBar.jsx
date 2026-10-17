import React from "react";
/** Applied filters as removable chips + Clear all. */
export function FilterBar({ filters = [], onRemove, onClear, onAdd }) {
  return <div className="filter-bar" role="group" aria-label="Active filters">
    <span className="fb-label"><i className="bx bx-filter-alt icon-14" aria-hidden="true"></i> Filters</span>
    {filters.map((f, i) => <span key={i} className={"filter-chip" + (f.tone ? " " + f.tone : "")}><span className="fc-key">{f.key}</span> {f.value} <button aria-label={"Remove " + f.key + ": " + f.value} onClick={() => onRemove && onRemove(f, i)}><i className="bx bx-x icon-12" aria-hidden="true"></i></button></span>)}
    {filters.length ? <button className="filter-clear" onClick={onClear}>Clear all</button> : null}
    <div className="spacer"></div>
    {onAdd ? <button className="btn btn-ghost btn-sm" onClick={onAdd}><i className="bx bx-plus icon-14" aria-hidden="true"></i> Add filter</button> : null}
  </div>;
}
