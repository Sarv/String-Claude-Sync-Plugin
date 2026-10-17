import React from "react";
export function Textarea({ className, ...rest }) { return <textarea className={"textarea" + (className ? " " + className : "")} {...rest}></textarea>; }
