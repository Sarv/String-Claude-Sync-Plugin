export interface PropRow {
  label: React.ReactNode;
  value?: React.ReactNode;
  /** Top-align (multi-line values like tags) */
  top?: boolean;
  required?: boolean;
  invalid?: boolean;
  error?: string;
  /** SLA row: label = target, due = "Due in 3 h", value = chip text, state = chip state */
  sla?: boolean;
  due?: string;
  state?: "running" | "breached" | "paused" | "met";
}
export interface PropsPanelProps {
  sections: { title: string; extra?: React.ReactNode; rows: PropRow[]; link?: string; open?: boolean }[];
  /** Wrap in .card (floating inside a page) */
  card?: boolean;
}
export function PropsPanel(props: PropsPanelProps): JSX.Element;
