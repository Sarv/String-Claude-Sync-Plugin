export interface ChannelMenuOption { key: string; name: string; sub: string; icon: string; bg: string; c: string; }
export interface ChannelMenuProps { value?: string; options?: ChannelMenuOption[]; onChange?: (key: string) => void; }
export function ChannelMenu(props: ChannelMenuProps): JSX.Element;
