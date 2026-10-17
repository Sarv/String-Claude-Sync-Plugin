import React from "react";
/** "Created" / "Updated" date-range filter button. With range set it turns brand and reads "Label: range". */
export function DateFilterButton({ icon = "calendar", label, range, onClick }) {
  return <button type="button" className={"date-filter" + (range ? " active" : "")} onClick={onClick}><i className={"bx bx-" + icon} aria-hidden="true"></i>{range ? label + ": " + range : label}</button>;
}
