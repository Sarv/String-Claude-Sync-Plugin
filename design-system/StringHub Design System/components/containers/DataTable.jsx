import React from "react";
/** .table-card > table.ds. columns[].render(row) for custom cells. */
export function DataTable({ columns = [], rows = [], compact, footer, rowClassName, onRowClick, empty }) {
  return <div className="table-card">
    <table className={"ds" + (compact ? " compact" : "")}>
      <thead><tr>{columns.map((c) => <th key={c.key} className={c.className} style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}</tr></thead>
      {rows.length ? <tbody>{rows.map((r, i) => <tr key={r.id ?? i} className={rowClassName ? rowClassName(r) : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined} style={onRowClick ? { cursor: "pointer" } : undefined}>
        {columns.map((c) => <td key={c.key} className={c.cellClassName ?? c.className}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody> : null}
    </table>
    {!rows.length && empty ? empty : null}
    {footer}
  </div>;
}
