import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HandControlState, Landmark } from '../types';
import { calculateDistance, isFist } from '../utils/mediapipeHelper';

export const useHandTracking = (videoRef: React.RefObject<HTMLVideoElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [controls, setControls] = useState<HandControlState>({
    zoom: 1.0,
    rotationSpeed: 0.1,
    roughness: 0.5,
    isInteracting: false,
  });

  const [loading, setLoading] = useState(true);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();

  // Smooth values to prevent jitter
  const smoothState = useRef({
    zoom: 1.0,
    rotationSpeed: 0.1,
    roughness: 0.5
  });

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        
        setLoading(false);
        startLoop();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setLoading(false);
      }
    };

    initMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLoop = () => {
    if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    const loop = () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && handLandmarkerRef.current) {
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        processResults(results);
        drawResults(results);
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const processResults = (results: HandLandmarkerResult) => {
    if (results.landmarks.length === 0) {
      setControls(prev => ({ ...prev, isInteracting: false }));
      return;
    }

    let targetZoom = smoothState.current.zoom;
    let targetRotation = smoothState.current.rotationSpeed;
    let targetRoughness = smoothState.current.roughness;

    // Identify hands based on handedness if available, otherwise heuristics
    // MediaPipe handedness: "Left" usually means it appears on the left side of the image (which is the user's right hand if mirrored)
    // We assume mirrored video input. 
    // Handedness[0].categoryName === "Left" -> User's Left Hand (on screen left)
    
    results.handedness.forEach((handInfo, index) => {
      const landmarks = results.landmarks[index] as unknown as Landmark[];
      const label = handInfo[0].categoryName; // "Left" or "Right"

      // 1. Zoom Control: Left Hand (Pinch)
      if (label === "Left") {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const distance = calculateDistance(thumbTip, indexTip);
        
        // Map distance (approx 0.02 to 0.2) to Zoom (0.5 to 3.0)
        // Adjust these thresholds based on testing
        const minPinch = 0.02;
        const maxPinch = 0.15;
        const normalized = Math.min(Math.max((distance - minPinch) / (maxPinch - minPinch), 0), 1);
        targetZoom = 0.5 + (normalized * 2.5);
      }

      // 2. Rotation Control: Right Hand (Index Slide)
      if (label === "Right") {
        const indexTip = landmarks[8];
        // Map X position (0 to 1) to Rotation Speed (-2.0 to 2.0)
        // 0.5 is center (stop), 0 is fast left, 1 is fast right
        const x = indexTip.x; 
        targetRotation = (x - 0.5) * 4.0;
      }

      // 3. Texture/Detail: Both Hands (Fist vs Open)
      // If ANY hand is a fist, increase roughness/heaviness
      if (isFist(landmarks)) {
        targetRoughness = 0.9; // Thick, heavy impasto
      } else {
        targetRoughness = 0.1; // Smooth, fine silk
      }
    });

    // Simple Lerp for smoothing
    const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;
    
    smoothState.current = {
      zoom: lerp(smoothState.current.zoom, targetZoom, 0.1),
      rotationSpeed: lerp(smoothState.current.rotationSpeed, targetRotation, 0.1),
      roughness: lerp(smoothState.current.roughness, targetRoughness, 0.05) // Slower transition for texture
    };

    setControls({
      zoom: smoothState.current.zoom,
      rotationSpeed: smoothState.current.rotationSpeed,
      roughness: smoothState.current.roughness,
      isInteracting: true
    });
  };

  const drawResults = (results: HandLandmarkerResult) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Match canvas size to video display size
    // Note: In the layout, we might force a specific aspect ratio, 
    // but for the skeleton overlay, we just map 0-1 coordinates.
    
    const drawingUtils = new DrawingUtils(ctx);
    
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
        color: "#FFFFFF",
        lineWidth: 2
      });
      drawingUtils.drawLandmarks(landmarks, {
        color: "#A0C4FF", // Light blue
        lineWidth: 1,
        radius: 3
      });
    }
  };

  return { controls, loading };
};