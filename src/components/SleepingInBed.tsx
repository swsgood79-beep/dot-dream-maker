import { useEffect, useRef } from 'react';
import type { Gender, GrowthStage } from '../types/game';
import { footprint } from '../engine/room';
import { TW, TH } from '../render/isoRenderer';
import { drawFurnitureSprite, furnitureFlipped, onFurnitureSheetReady } from '../render/furnitureSprites';
import { drawCharacter, onSheetReady, RES } from '../render/spriteCharacter';

/** 침대에 이불 덮고 머리만 내놓고 자는 아이 (방 화면과 같은 그림·같은 배치) */
export function SleepingInBed({ stage, gender, bedId, scale = 3 }: { stage: GrowthStage; gender: Gender; bedId: string; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const W = 84;
  const H = 52;
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const bed = { furnitureId: bedId, gridX: 0, gridY: 0, rotation: 0 as const };
    const fp = footprint(bed);
    const gx = fp.reduce((a, c) => a + c.x, 0) / fp.length + 0.5;
    const gy = fp.reduce((a, c) => a + c.y, 0) / fp.length + 0.5;
    const gw = Math.max(...fp.map((c) => c.x)) + 1;
    const gh = Math.max(...fp.map((c) => c.y)) + 1;
    // 침대 가운데가 캔버스 가운데 아래쪽에 오도록
    const p0 = (x: number, y: number): [number, number] => [((x - y) * TW) / 2, ((x + y) * TH) / 2];
    const [mx, my] = p0(gw / 2, gh / 2);
    const proj = (x: number, y: number): [number, number] => {
      const [a, b] = p0(x, y);
      return [a - mx + W / 2, b - my + H * 0.74];
    };
    let raf = 0;
    const t0 = performance.now();
    const draw = () => {
      ctx.setTransform(scale * RES, 0, 0, scale * RES, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;
      drawFurnitureSprite(ctx, proj, bed);
      const [sx, sy] = proj(gx, gy);
      drawCharacter(ctx, sx, sy + 2, { stage, gender, facing: furnitureFlipped(bed) ? 'L' : 'R', pose: 'sleep', time: performance.now() - t0, inBed: true });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const off1 = onSheetReady(() => {});
    const off2 = onFurnitureSheetReady(() => {});
    return () => {
      cancelAnimationFrame(raf);
      off1();
      off2();
    };
  }, [stage, gender, bedId, scale]);
  return <canvas ref={ref} width={W * scale * RES} height={H * scale * RES} style={{ width: W * scale, height: H * scale, imageRendering: 'pixelated' }} />;
}
