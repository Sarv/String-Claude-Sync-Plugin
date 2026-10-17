import React from "react";
/** Save View (toolbar-size primary) pushed to the right of a ListToolbar; unsaved = orange outlined "Unsaved Changes ▾" once a saved view was edited. */
export function SaveViewButton({ unsaved, onClick }) {
  return unsaved
    ? <button type="button" className="btn btn-unsaved lt-push" onClick={onClick}>Unsaved Changes <i className="bx bx-chevron-down" aria-hidden="true"></i></button>
    : <button type="button" className="btn btn-custom-primary lt-push" onClick={onClick}>Save View</button>;
}
