import { useEffect, useRef } from 'react';

export function LiquidGlassOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Canvas is fixed to card size
    canvas.width = 600;
    canvas.height = 400;

    // Create gradient blob
    const createBlob = (
      x: number,
      y: number,
      radius: number,
      color: string
    ) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      return gradient;
    };

    // Animation loop for liquid effect
    const animate = () => {
      time += 0.003;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Create multiple animated blobs for liquid effect
      const blobs = [
        {
          x: centerX + Math.sin(time) * 100,
          y: centerY + Math.cos(time * 0.8) * 80,
          radius: 150 + Math.sin(time * 2) * 30,
          color: 'rgba(255, 255, 255, 0.08)',
        },
        {
          x: centerX + Math.sin(time * 1.2 + 2) * 120,
          y: centerY + Math.cos(time * 0.9 + 3) * 100,
          radius: 180 + Math.sin(time * 1.5) * 35,
          color: 'rgba(255, 255, 255, 0.06)',
        },
        {
          x: centerX + Math.sin(time * 0.8 + 4) * 90,
          y: centerY + Math.cos(time * 1.1 + 1) * 90,
          radius: 140 + Math.sin(time * 1.8) * 25,
          color: 'rgba(200, 220, 255, 0.05)',
        },
      ];

      // Draw blobs
      blobs.forEach((blob) => {
        ctx.fillStyle = createBlob(blob.x, blob.y, blob.radius, blob.color);
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div 
        className="relative rounded-3xl overflow-hidden"
        style={{
          width: '600px',
          height: '400px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        }}
      >
        {/* Liquid gradient blobs */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ 
            mixBlendMode: 'screen',
          }}
        />
        
        {/* Frosted glass with backdrop blur */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(60px)',
            WebkitBackdropFilter: 'blur(60px)',
          }}
        />

        {/* Subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Glass highlights */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 80%, rgba(255, 255, 255, 0.1) 100%)',
          }}
        />

        {/* Top shimmer */}
        <div 
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)',
          }}
        />
      </div>
    </div>
  );
}
