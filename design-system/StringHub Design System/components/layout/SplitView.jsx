import React from "react";
export function SplitView({ list, detail }) {
  return <div className="split-view" style={{ flex: 1, minHeight: 0 }}><div className="split-list">{list}</div><div className="split-detail">{detail}</div></div>;
}
