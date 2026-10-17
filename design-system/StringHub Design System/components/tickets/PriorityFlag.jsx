import React from "react";
function flag(p) {
  return <span className="tk-slot" title={(p || "none").charAt(0).toUpperCase() + (p || "none").slice(1)}><svg className={"tk-flag " + (p || "none")} viewBox="0 0 48 60" aria-hidden="true"><path d="M40.7876 2.5737C29.1561 4.5185 15.017 2.36182 5.62262 0.0881193C3.18299 -0.50234 0.71611 1.97719 1.09747 4.45812C3.17005 17.9411 1.52481 41.9585 0.0174201 56.0937C-0.173072 57.88 1.22081 59.4428 3.01724 59.4428H4.14452C5.87935 59.4428 7.26022 57.9778 7.20558 56.2439C7.10373 53.0115 7.04734 48.1028 7.2028 42.1643C7.25776 40.0648 9.42637 38.6966 11.428 39.3323C25.392 43.7671 38.6069 40.4154 45.7565 37.1116C47.3497 36.3754 47.7589 34.3781 46.7295 32.9566L40.8007 24.7693C39.2706 22.6564 38.7925 19.9946 39.8189 17.5963C41.0594 14.6975 42.8638 10.8248 44.4858 6.69599C45.3773 4.42666 43.1924 2.17161 40.7876 2.5737Z" /></svg></span>;
}
/** Priority flag glyph in the priority colour (urgent #EF4444, high #E65100, medium #F9A825, low #1E8E3E, none #9E9E9E). */
export function PriorityFlag({ priority = "none" }) { return flag(priority); }
