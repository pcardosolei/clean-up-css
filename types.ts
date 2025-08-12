export type ClassInfo = {
  type: "class" | "id";
  value: string;
  isNested: boolean;
  parent?: ClassInfo | null;
  found: boolean;
  times: number;
};
