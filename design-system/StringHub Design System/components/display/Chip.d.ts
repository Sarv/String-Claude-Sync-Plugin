export interface ChipProps {
  /** default lilac (chipBackground) · accent · grey (secondary, "+3 more") */
  tone?: "accent" | "grey";
  /** Optional Boxicons name, e.g. "envelope" or "bxl-whatsapp" */
  icon?: string;
  children: React.ReactNode;
}
export function Chip(props: ChipProps): JSX.Element;
