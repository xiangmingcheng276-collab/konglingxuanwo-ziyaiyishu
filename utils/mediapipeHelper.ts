import { Landmark } from '../types';

export const calculateDistance = (p1: Landmark, p2: Landmark): number => {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + 
    Math.pow(p2.y - p1.y, 2)
  );
};

export const isFist = (landmarks: Landmark[]): boolean => {
  // Check if fingertips are closer to wrist than their respective PIP joints
  // Wrist is index 0
  // Index: Tip 8, PIP 6
  // Middle: Tip 12, PIP 10
  // Ring: Tip 16, PIP 14
  // Pinky: Tip 20, PIP 18
  
  const wrist = landmarks[0];
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  
  let foldedFingers = 0;
  
  for (let i = 0; i < 4; i++) {
    const tip = landmarks[tips[i]];
    const pip = landmarks[pips[i]];
    
    // Simple distance check to wrist - if tip is significantly closer than pip (or very close to wrist)
    const tipDist = calculateDistance(tip, wrist);
    const pipDist = calculateDistance(pip, wrist);
    
    if (tipDist < pipDist * 0.8) { // 0.8 factor to be lenient
        foldedFingers++;
    }
  }
  
  return foldedFingers >= 3; // If 3 or more fingers are folded, consider it a fist/grip
};
