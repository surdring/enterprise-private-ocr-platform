export const APP_NAME = "Enterprise OCR Compute";
export const GPU_MODEL_NAME = "NVIDIA RTX 4090";
export const GPU_TOTAL_MEMORY = 24; // GB

export const MOCK_OCR_RESULTS = [
  { id: 1, text: "INVOICE #001234", confidence: 0.98, box: [10, 10, 200, 30] },
  { id: 2, text: "Date: 2023-10-27", confidence: 0.96, box: [10, 50, 150, 30] },
  { id: 3, text: "Vendor: Acme Corp", confidence: 0.99, box: [10, 90, 180, 30] },
  { id: 4, text: "Total Amount:", confidence: 0.95, box: [10, 150, 120, 30] },
  { id: 5, text: "$1,250.00", confidence: 0.92, box: [140, 150, 100, 30] },
  { id: 6, text: "Tax ID: 99-88221", confidence: 0.88, box: [10, 200, 160, 30] },
  { id: 7, text: "Shipping: Free", confidence: 0.65, box: [10, 240, 140, 30] }, // Low confidence example
  { id: 8, text: "Notes: Deliver to rear entrance", confidence: 0.82, box: [10, 280, 300, 30] },
];
