export type ClusterId =
  | "police"
  | "health"
  | "edu"
  | "municipality"
  | "utilities"
  | "transport"
  | "other";

export type Cluster = {
  id: ClusterId;
  label: string;
  labelShort: string;
  labelAr: string;
  index: number;
  target: number;
};

// Values from the slide 6 mock; represent Council-level mock data.
export const CLUSTERS: Cluster[] = [
  { id: "police", label: "Police", labelShort: "Police", labelAr: "الشرطة", index: 0, target: 75 },
  { id: "health", label: "Health", labelShort: "Health", labelAr: "الصحة", index: 0, target: 75 },
  { id: "edu", label: "Education", labelShort: "Edu", labelAr: "التعليم", index: 0, target: 75 },
  { id: "municipality", label: "Municipality", labelShort: "Municip.", labelAr: "البلدية", index: 0, target: 75 },
  { id: "utilities", label: "Utilities", labelShort: "Utilities", labelAr: "الخدمات", index: 0, target: 75 },
  { id: "transport", label: "Transport", labelShort: "Transport", labelAr: "النقل", index: 0, target: 75 },
  { id: "other", label: "Other", labelShort: "Other", labelAr: "أخرى", index: 0, target: 75 },
];

export function getCluster(id: ClusterId) {
  return CLUSTERS.find((c) => c.id === id)!;
}
