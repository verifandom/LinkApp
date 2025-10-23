import { useEffect, useRef } from 'react';

export function HalftoneCloud() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Terminal-style grid settings - responsive font size
    const isMobile = window.innerWidth < 768;
    const fontSize = isMobile ? 6 : 8;
    const charSpacing = 6;
    let gridRef: boolean[][] = [];
    let time = 0;

    // Noise function for organic patterns
    const noise2D = (x: number, y: number, seed: number = 0) => {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      
      const hash = (n: number) => {
        n = ((n << 13) ^ n);
        return (n * (n * n * 15731 + 789221) + 1376312589 + seed) & 0x7fffffff;
      };
      
      const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
      
      const lerp = (a: number, b: number, t: number) => a + t * (b - a);
      
      const grad = (h: number, x: number, y: number) => {
        const v = (h & 1) === 0 ? x : y;
        return ((h & 2) === 0 ? -v : v);
      };
      
      const a = hash(X) + Y;
      const aa = hash(a);
      const ab = hash(a + 1);
      const b = hash(X + 1) + Y;
      const ba = hash(b);
      const bb = hash(b + 1);
      
      const u = fade(xf);
      const v = fade(yf);
      
      return lerp(
        lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
        lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
        v
      ) * 0.5 + 0.5;
    };

    // Initialize grid-based halftone pattern
    const initGrid = () => {
      // Add padding to prevent gaps when waves distort
      const padding = 50;
      const cols = Math.ceil(canvas.width / charSpacing) + Math.ceil(padding * 2 / charSpacing);
      const rows = Math.ceil(canvas.height / charSpacing) + Math.ceil(padding * 2 / charSpacing);
      
      gridRef = [];
      
      for (let row = 0; row < rows; row++) {
        gridRef[row] = [];
        for (let col = 0; col < cols; col++) {
          // Create cloud formations using layered noise
          const x = col / cols;
          const y = row / rows;
          
          // Multiple noise layers for organic cloud shapes
          const noise1 = noise2D(col * 0.02, row * 0.02, 0);
          const noise2 = noise2D(col * 0.04, row * 0.04, 100);
          const noise3 = noise2D(col * 0.01, row * 0.01, 200);
          
          // Combine noise layers
          const combined = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
          
          // Create cloud density with some randomness
          const threshold = 0.45 + Math.random() * 0.1;
          gridRef[row][col] = combined > threshold;
        }
      }
    };

    // Set canvas size
    const updateSize = () => {
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
        // For mobile, use a centered fixed size canvas
        canvas.width = 1920;
        canvas.height = 1080;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      initGrid();
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation loop with wave motion
    const animate = () => {
      time += 0.004;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "Consolas", "Menlo", "Monaco", monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';

      const padding = 50;
      const rows = gridRef.length;
      
      for (let row = 0; row < rows; row++) {
        if (!gridRef[row]) continue;
        const cols = gridRef[row].length;
        
        for (let col = 0; col < cols; col++) {
          if (gridRef[row][col]) {
            // Apply padding offset so the grid starts from negative coordinates
            const x = col * charSpacing + charSpacing / 2 - padding;
            const y = row * charSpacing + charSpacing / 2 - padding;
            
            // Slower wave motion with reduced amplitude
            const waveX = Math.sin(time + row * 0.08) * 8;
            
            // Vertical wave with different frequency
            const waveY = Math.sin(time * 0.8 + col * 0.06) * 6;
            
            // Combined wave effect with secondary waves
            const offsetX = waveX + Math.sin(time * 0.5 + col * 0.05) * 3;
            const offsetY = waveY + Math.cos(time * 0.6 + row * 0.04) * 3;
            
            // Wave-based opacity variation for depth
            const opacity = 0.6 + Math.sin(time + col * 0.08 + row * 0.08) * 0.4;
            ctx.globalAlpha = Math.max(0.3, Math.min(1.0, opacity));
            
            ctx.fillText('.', x + offsetX, y + offsetY);
          }
        }
      }
      
      ctx.globalAlpha = 1.0;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="md:w-full md:h-full"
        style={{ 
          background: '#000000',
          width: '1920px',
          height: '1080px'
        }}
      />
    </div>
  );
}
