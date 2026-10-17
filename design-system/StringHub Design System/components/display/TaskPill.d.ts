export interface TaskPillProps {
  kind?: "status" | "priority" | "type";
  /** status: backlog unstarted started in-progress in-review completed cancelled on-hold rejected · priority: urgent critical high medium low none · type: new update bug feature improvement */
  value: string;
  /** Leading dot (status groups, headers) */
  dot?: boolean;
  /** Override label (defaults to a sentence-cased value) */
  children?: React.ReactNode;
}
export function TaskPill(props: TaskPillProps): JSX.Element;
