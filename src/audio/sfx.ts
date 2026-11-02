/**
 * 8비트 효과음 — 외부 음원 파일 없이 Web Audio API로 즉석 합성.
 * 브라우저 정책상 첫 사용자 터치 이후에만 소리가 난다 (AudioContext 지연 생성).
 */
export type SfxName =
  | 'click'
  | 'buy'
  | 'combo'
  | 'stat'
  | 'great'
  | 'fail'
  | 'levelup'
  | 'drumroll'
  | 'win'
  | 'lose'
  | 'ending'
  | 'door'
  | 'page';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.35;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.35;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

interface Tone {
  f: number; // 시작 주파수 Hz
  to?: number; // 끝 주파수 (슬라이드)
  d: number; // 길이 s
  at?: number; // 시작 지연 s
  type?: OscillatorType;
  v?: number; // 볼륨 0~1
}

function tone(t: Tone) {
  const c = ac();
  if (!c || !master || muted) return;
  const start = c.currentTime + (t.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = t.type ?? 'square';
  osc.frequency.setValueAtTime(t.f, start);
  if (t.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, t.to), start + t.d);
  const v = (t.v ?? 0.5) * 0.6;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(v, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + t.d);
  osc.connect(g).connect(master);
  osc.start(start);
  osc.stop(start + t.d + 0.02);
}

function noise(d: number, at = 0, v = 0.3, hp = 800) {
  const c = ac();
  if (!c || !master || muted) return;
  const len = Math.max(1, Math.floor(c.sampleRate * d));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = v * 0.6;
  src.connect(filt).connect(g).connect(master);
  src.start(c.currentTime + at);
}

const arp = (notes: number[], step: number, type: OscillatorType = 'square', v = 0.45, last = 0) =>
  notes.forEach((f, i) => tone({ f, d: i === notes.length - 1 && last ? last : step * 1.2, at: i * step, type, v }));

// 음계 (Hz)
const C5 = 523, D5 = 587, E5 = 659, G5 = 784, A5 = 880, C6 = 1047, E6 = 1319, G4 = 392, E4 = 330, C4 = 262;

const SOUNDS: Record<SfxName, () => void> = {
  click: () => tone({ f: 660, to: 990, d: 0.05, v: 0.25 }),
  page: () => tone({ f: 440, to: 660, d: 0.07, type: 'triangle', v: 0.3 }),
  buy: () => {
    tone({ f: 988, d: 0.07, v: 0.35 });
    tone({ f: 1319, d: 0.18, at: 0.07, v: 0.35 });
  },
  combo: () => arp([C5, E5, G5, C6, E6], 0.07, 'triangle', 0.5, 0.3),
  stat: () => tone({ f: 880, to: 1320, d: 0.08, type: 'triangle', v: 0.25 }),
  great: () => {
    arp([G5, C6, E6], 0.06, 'square', 0.35, 0.25);
    tone({ f: 2093, d: 0.15, at: 0.2, type: 'triangle', v: 0.25 });
  },
  fail: () => tone({ f: 330, to: 140, d: 0.3, type: 'sawtooth', v: 0.25 }),
  levelup: () => arp([C5, G5, C6], 0.08, 'square', 0.35, 0.2),
  door: () => {
    noise(0.08, 0, 0.25, 300);
    tone({ f: 180, to: 120, d: 0.1, type: 'triangle', v: 0.3, at: 0.05 });
  },
  drumroll: () => {
    for (let i = 0; i < 18; i++) noise(0.05, i * 0.09, 0.15 + (i / 18) * 0.25, 1200);
  },
  win: () => {
    arp([C5, C5, C5, G5], 0.11, 'square', 0.4);
    tone({ f: E5, d: 0.12, at: 0.5, v: 0.4 });
    tone({ f: G5, d: 0.12, at: 0.62, v: 0.4 });
    tone({ f: C6, d: 0.5, at: 0.74, v: 0.45 });
    tone({ f: C5, d: 0.5, at: 0.74, type: 'triangle', v: 0.35 });
  },
  lose: () => arp([G4, E4, C4], 0.18, 'triangle', 0.4, 0.45),
  ending: () => {
    const mel = [C5, E5, G5, C6, A5, G5, E5, G5, C6, D5 * 2, E6];
    mel.forEach((f, i) => tone({ f, d: i === mel.length - 1 ? 0.8 : 0.16, at: i * 0.15, v: 0.4 }));
    [C4, G4, C5].forEach((f, i) => tone({ f, d: 1.6, at: i * 0.5, type: 'triangle', v: 0.25 }));
  },
};

export function sfx(name: SfxName) {
  try {
    SOUNDS[name]();
  } catch {
    /* 오디오 불가 환경 무시 */
  }
}
