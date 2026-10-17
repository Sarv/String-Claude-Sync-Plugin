export interface SkeletonProps {
  shape?: "line" | "title" | "circle" | "pill" | "block";
  width?: number | string;
  height?: number | string;
}
export function Skeleton(props: SkeletonProps): JSX.Element;
