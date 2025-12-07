export interface HandControlState {
  zoom: number;           // Controlled by Left Hand Pinch (0.5 - 3.0)
  rotationSpeed: number;  // Controlled by Right Hand Index (negative to positive)
  roughness: number;      // Controlled by Fist (High) vs Open (Low)
  isInteracting: boolean; // True if hands are detected
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}