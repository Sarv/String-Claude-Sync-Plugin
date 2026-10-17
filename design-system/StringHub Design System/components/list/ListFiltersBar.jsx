import React from "react";
/** Active-filters bar under ListHeaderBar: "Filters (N):" chips (coloured values with ✕), Clear All, Save View. Hide it when nothing is filtered. */
export function ListFiltersBar({ filters = [], onRemove, onClearAll, saveLabel = "Save View", onSave }) {
  const n = filters.reduce((a, f) => a + f.values.length, 0);
  return <div className="tk-filters"><b>Filters ({n}):</b>
    <div className="tk-filter-strip">
      {filters.map((f, i) => <span key={i} className="tk-fchip"><b>{f.label}:</b>
        {f.values.map((v, j) => <React.Fragment key={j}>{j ? <span className="dot">•</span> : null}<span className="v" style={{ "--c": v.color }}>{v.text}</span><button type="button" style={{ "--c": v.color }} aria-label={"Remove " + v.text} onClick={() => onRemove && onRemove(f.label, v.text)}><i className="bx bx-x" aria-hidden="true"></i></button></React.Fragment>)}
      </span>)}
      {n ? <button type="button" className="tk-clear" onClick={onClearAll}>Clear All</button> : null}
    </div>
    {saveLabel ? <button type="button" className="btn btn-custom-primary tk-save" onClick={onSave}>{saveLabel}</button> : null}
  </div>;
}
