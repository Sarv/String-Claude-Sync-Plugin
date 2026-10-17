import React from "react";
/** Breadcrumb shown above the ListToolbar while a saved view is open: back button · Views / name. */
export function ViewCrumb({ name, onBack }) {
  return <div className="view-crumb"><button type="button" className="icon-btn" aria-label="Back to views" onClick={onBack}><i className="bx bx-arrow-back" aria-hidden="true"></i></button>
    <a href="#" onClick={(e) => { e.preventDefault(); onBack && onBack(); }}>Views</a><span>/</span><strong>{name}</strong></div>;
}
