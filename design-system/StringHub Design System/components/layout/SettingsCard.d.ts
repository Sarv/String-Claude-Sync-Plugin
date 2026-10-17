export interface SettingsCardProps {
  title: string;
  description?: string;
  /** Edge-to-edge SettingRows */
  flush?: boolean;
  /** Red destructive card */
  danger?: boolean;
  children?: React.ReactNode;
}
export function SettingsCard(props: SettingsCardProps): JSX.Element;
