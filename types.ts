export interface OCRResult {
  id: number;
  text: string;
  confidence: number;
  box: number[]; // Simplified bounding box [x, y, w, h]
}

export interface ProcessingStats {
  todayCount: number;
  timeSavedHours: number;
  accuracy: number;
}

export interface GPUStats {
  model: string;
  totalMemory: number; // in GB
  usedMemory: number; // in GB
  utilization: number; // percentage
  temperature: number; // celsius
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  WORKBENCH = 'WORKBENCH',
}