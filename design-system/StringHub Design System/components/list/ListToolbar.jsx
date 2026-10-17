import React from "react";
/** The one row of 30px list controls under a list page header. Put ViewToggle, StatusToggle, FilterSelect, ToolbarSearch, DateFilterButton and SaveViewButton inside, in that order. */
export function ListToolbar({ children }) {
  return <div className="list-toolbar" role="toolbar" aria-label="List controls">{children}</div>;
}
