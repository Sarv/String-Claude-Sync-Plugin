import React from "react";
export function SearchTrigger({ placeholder = "Search…", hint = "⌘K", onClick }) {
  return <button className="search-trigger" onClick={onClick}><i className="bx bx-search icon-18" aria-hidden="true"></i><span>{placeholder}</span><span className="kbd-hint">{hint}</span></button>;
}
