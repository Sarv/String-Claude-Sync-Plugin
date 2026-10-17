import React from "react";
export function Skeleton({ shape = "line", width, height }) {
  return <span className={"skeleton" + (shape !== "line" ? " " + shape : "")} style={width || height ? { width, height } : undefined}></span>;
}
