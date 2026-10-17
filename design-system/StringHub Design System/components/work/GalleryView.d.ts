export interface GalleryGroup { id: string; label: string; icon: string; color: string; count: number; }
export interface GalleryTicket { id: string; subject: string; priority: "urgent" | "high" | "medium" | "low"; date: string; replies: number; assignee: string; tone?: 1 | 2 | 3 | 4 | 5 | 6; }
export interface GalleryViewProps {
  groupTitle?: string;
  groups: GalleryGroup[];
  selectedGroup?: string;
  onGroup?: (id: string) => void;
  tickets: GalleryTicket[];
  selectedTicket?: string;
  onTicket?: (id: string) => void;
  /** Detail column content: .gv-detail-head + .gv-detail-body */
  detail?: React.ReactNode;
  onNew?: () => void;
}
export function GalleryView(props: GalleryViewProps): JSX.Element;
