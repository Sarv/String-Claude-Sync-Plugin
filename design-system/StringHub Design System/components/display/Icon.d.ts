export interface IconProps {
  /** Boxicons name without prefix ("search") or with ("bxs-flag", "bxl-whatsapp"). */
  name: string;
  /** Theme size class: 12 13 14 16 17 18 20 22 24 28 36 52 */
  size?: 12 | 13 | 14 | 16 | 17 | 18 | 20 | 22 | 24 | 28 | 36 | 52;
  /** Use the solid (bxs-) style — active/filled states. */
  solid?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
export function Icon(props: IconProps): JSX.Element;
