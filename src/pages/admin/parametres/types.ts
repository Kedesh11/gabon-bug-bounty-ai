import type { ReactNode } from "react";

export interface Integration {
  id: string;
  title: string;
  desc: string;
  icon: ReactNode;
  connected: boolean;
}
