export interface HeatmapProps {
  /** 7 rows (Mon–Sun) × 24 hour values */
  data: number[][];
  /** Dashed business-hours box on weekdays; null to hide */
  businessHours?: [number, number] | null;
  unit?: string;
}
export function Heatmap(props: HeatmapProps): JSX.Element;
