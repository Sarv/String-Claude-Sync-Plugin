export interface SettingRowProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The control (Toggle, Input, Button) */
  children?: React.ReactNode;
}
export function SettingRow(props: SettingRowProps): JSX.Element;
