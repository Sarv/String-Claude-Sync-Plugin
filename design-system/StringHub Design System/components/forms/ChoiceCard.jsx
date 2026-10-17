import React from "react";
/** Dense one-line choice with an identity mark (agent, voice, template). Grid: <div className="choice-card-grid">. */
export function ChoiceCard({ mark, tone = 1, name, meta, selected, onClick, action }) {
  return <div className={"choice-card" + (selected ? " selected" : "")} tabIndex={0} role="button" aria-pressed={!!selected} onClick={onClick}>
    <span className={"ico g" + tone}>{mark}</span><div className="body"><span className="name">{name}</span>{meta ? <span className="meta">{meta}</span> : null}</div>{action}</div>;
}
