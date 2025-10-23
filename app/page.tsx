import { HalftoneCloud } from './components/HalftoneCloud';
import { LiquidGlassOverlay } from './components/LiquidGlassOverlay';

export default function Home() {
  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <HalftoneCloud />
      <LiquidGlassOverlay />
    </div>
  );
}
