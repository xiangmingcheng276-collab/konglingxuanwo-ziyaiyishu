import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { SwirlShader } from './components/SwirlShader';
import { useHandTracking } from './hooks/useHandTracking';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize camera
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            frameRate: 30
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => setCameraReady(true);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };
    startCamera();
  }, []);

  const { controls, loading } = useHandTracking(videoRef, canvasRef);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-10">
        <Canvas gl={{ antialias: false, pixelRatio: 1 }}>
          <SwirlShader 
            zoom={controls.zoom} 
            rotationSpeed={controls.rotationSpeed} 
            roughness={controls.roughness}
            isInteracting={controls.isInteracting}
          />
          <EffectComposer>
             <Bloom 
                intensity={controls.isInteracting ? 1.5 : 0.5} 
                luminanceThreshold={0.2} 
                luminanceSmoothing={0.9} 
             />
          </EffectComposer>
        </Canvas>
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header */}
        <header className="text-white/80 mix-blend-difference">
          <h1 className="text-3xl font-light tracking-widest uppercase">Ethereal Swirl</h1>
          <p className="text-xs tracking-wider opacity-70 mt-1">Interactive Generative Art</p>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
            <div className="text-center">
              <div className="w-12 h-12 border-t-2 border-l-2 border-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-blue-200 tracking-widest text-sm">INITIALIZING AI VISION...</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute top-6 right-6 text-right space-y-2 max-w-xs text-white/90 mix-blend-difference hidden md:block">
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10">
            <h3 className="text-xs font-bold uppercase mb-2 text-blue-200">Controls</h3>
            <ul className="text-xs space-y-1 opacity-80">
              <li><span className="font-bold">Left Pinch:</span> Zoom In/Out</li>
              <li><span className="font-bold">Right Slide:</span> Rotate Speed</li>
              <li><span className="font-bold">Fist:</span> Heavy Texture</li>
              <li><span className="font-bold">Open Palm:</span> Fine Texture</li>
            </ul>
          </div>
        </div>

        {/* HUD / Debug View */}
        <div className="flex items-end justify-between w-full">
          <div className="relative w-48 h-36 bg-black/40 border border-white/20 rounded-lg overflow-hidden backdrop-blur-sm">
            {/* Hidden Video Element for Logic */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover opacity-20 -scale-x-100" 
            />
            {/* Visual Feedback Canvas */}
            <canvas 
              ref={canvasRef} 
              width={640} 
              height={480} 
              className="absolute inset-0 w-full h-full object-cover -scale-x-100" 
            />
            <div className="absolute bottom-2 left-2 text-[10px] text-blue-300 font-mono">
              SENSORS_ACTIVE<br/>
              ZOOM: {controls.zoom.toFixed(2)}<br/>
              SPEED: {controls.rotationSpeed.toFixed(2)}
            </div>
          </div>
          
          {/* Interaction Feedback Indicator */}
          <div className={`transition-opacity duration-500 ${controls.isInteracting ? 'opacity-100' : 'opacity-0'}`}>
             <div className="text-white/50 text-sm tracking-widest font-mono">
               Input Detected
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
