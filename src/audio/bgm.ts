import { getAudio } from './sfx';

/**
 * 배경음악: 음원 파일 없이 Web Audio로 직접 연주하는 칩튠 6곡 (모두 이 게임을 위해 새로 쓴 곡).
 * 멜로디는 [MIDI 음, 8분음표 길이] 목록, 코드는 마디마다 근음(MIDI).
 */
export type TrackId = 'TITLE' | 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'ENDING';

interface Track {
  bpm: number;
  lead: OscillatorType;
  melody: [number, number][];
  /** 마디(8분음표 8개)마다 코드 근음 */
  chords: number[];
  /** 베이스 패턴: 'pulse' 근음-5도 4분음표, 'long' 마디 전체 */
  bass: 'pulse' | 'long';
  hat: boolean;
}

const TRACKS: Record<TrackId, Track> = {
  TITLE: {
    bpm: 100, lead: 'square', bass: 'pulse', hat: false,
    melody: [
      [76, 2], [79, 2], [84, 2], [83, 1], [81, 1], [79, 4], [76, 4], [77, 2], [81, 2], [84, 2], [83, 1], [81, 1], [79, 8],
      [76, 2], [79, 2], [81, 2], [79, 2], [77, 2], [76, 2], [74, 4], [72, 2], [74, 2], [76, 2], [74, 2], [72, 8],
    ],
    chords: [48, 52, 53, 48, 45, 50, 43, 48],
  },
  SPRING: {
    bpm: 112, lead: 'square', bass: 'pulse', hat: true,
    melody: [
      [72, 2], [76, 2], [79, 2], [76, 2], [77, 2], [76, 1], [74, 1], [72, 4], [74, 2], [77, 2], [81, 2], [79, 2], [77, 2], [76, 2], [74, 4],
      [72, 2], [76, 2], [79, 3], [81, 1], [79, 2], [77, 2], [76, 4], [74, 2], [76, 1], [77, 1], [79, 2], [71, 2], [72, 8],
    ],
    chords: [48, 53, 50, 43, 48, 53, 43, 48],
  },
  SUMMER: {
    bpm: 132, lead: 'square', bass: 'pulse', hat: true,
    melody: [
      [67, 1], [71, 1], [74, 2], [71, 1], [74, 1], [79, 2], [78, 2], [76, 2], [74, 4], [72, 1], [76, 1], [79, 2], [76, 1], [79, 1], [84, 2], [83, 2], [81, 2], [79, 4],
      [79, 1], [81, 1], [83, 2], [81, 2], [79, 2], [76, 2], [74, 2], [72, 4], [74, 1], [76, 1], [78, 2], [81, 2], [78, 2], [79, 8],
    ],
    chords: [43, 50, 48, 43, 52, 48, 50, 43],
  },
  AUTUMN: {
    bpm: 92, lead: 'triangle', bass: 'long', hat: false,
    melody: [
      [69, 3], [72, 1], [76, 4], [74, 2], [72, 2], [71, 4], [69, 3], [71, 1], [72, 2], [74, 2], [76, 8],
      [77, 3], [76, 1], [74, 4], [72, 2], [71, 2], [69, 4], [71, 2], [72, 2], [74, 2], [68, 2], [69, 8],
    ],
    chords: [45, 52, 53, 48, 50, 45, 52, 45],
  },
  WINTER: {
    bpm: 80, lead: 'triangle', bass: 'long', hat: false,
    melody: [
      [77, 2], [81, 2], [84, 4], [82, 2], [81, 2], [79, 4], [77, 2], [79, 2], [81, 2], [82, 2], [81, 8],
      [82, 2], [84, 2], [86, 4], [84, 2], [82, 2], [81, 4], [79, 2], [77, 2], [76, 2], [79, 2], [77, 8],
    ],
    chords: [41, 48, 50, 41, 46, 41, 48, 41],
  },
  ENDING: {
    bpm: 72, lead: 'triangle', bass: 'long', hat: false,
    melody: [
      [72, 4], [79, 4], [77, 2], [76, 2], [74, 4], [76, 4], [81, 4], [79, 8],
      [77, 4], [76, 2], [74, 2], [72, 2], [74, 2], [76, 4], [74, 4], [71, 2], [74, 2], [72, 8],
    ],
    chords: [48, 43, 45, 52, 41, 48, 43, 48],
  },
};

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const BGM_VOLUME = 0.32;

let current: TrackId | null = null;
let out: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextLoop = 0;

function note(c: AudioContext, dest: AudioNode, f: number, at: number, d: number, type: OscillatorType, v: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(v, at + 0.012);
  g.gain.setValueAtTime(v, at + Math.max(0.02, d * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + d + 0.02);
}

function hat(c: AudioContext, dest: AudioNode, at: number) {
  const len = Math.floor(c.sampleRate * 0.03);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6000;
  const g = c.createGain();
  g.gain.value = 0.18;
  src.connect(f).connect(g).connect(dest);
  src.start(at);
}

/** 한 바퀴(8마디) 분량을 미리 예약 */
function scheduleLoop(c: AudioContext, dest: AudioNode, t: Track, start: number) {
  const e = 60 / t.bpm / 2; // 8분음표 길이(초)
  let pos = 0;
  for (const [m, len] of t.melody) {
    note(c, dest, hz(m), start + pos * e, len * e * 0.95, t.lead, t.lead === 'square' ? 0.16 : 0.32);
    pos += len;
  }
  t.chords.forEach((root, bar) => {
    const b0 = start + bar * 8 * e;
    if (t.bass === 'pulse') {
      [0, 7, 0, 7].forEach((iv, q) => note(c, dest, hz(root - 12 + iv), b0 + q * 2 * e, e * 1.6, 'triangle', 0.34));
    } else {
      note(c, dest, hz(root - 12), b0, e * 7.6, 'triangle', 0.3);
      note(c, dest, hz(root - 12 + 7), b0 + 4 * e, e * 3.6, 'sine', 0.16);
    }
    if (t.hat) for (let k = 1; k < 8; k += 2) hat(c, dest, b0 + k * e);
  });
  return start + t.chords.length * 8 * e;
}

/** 곡 재생 (같은 곡이면 그대로). null이면 정지 */
export function playBgm(id: TrackId | null) {
  if (id === current) return;
  const a = getAudio();
  // 이전 곡은 페이드아웃
  if (out && a) {
    const old = out;
    old.gain.setTargetAtTime(0.0001, a.c.currentTime, 0.25);
    setTimeout(() => old.disconnect(), 1500);
  }
  if (timer) clearInterval(timer);
  timer = null;
  out = null;
  current = id;
  if (!id || !a) return;
  const t = TRACKS[id];
  const g = a.c.createGain();
  g.gain.setValueAtTime(0.0001, a.c.currentTime);
  g.gain.setTargetAtTime(BGM_VOLUME, a.c.currentTime + 0.3, 0.4);
  g.connect(a.master);
  out = g;
  nextLoop = a.c.currentTime + 0.4;
  const pump = () => {
    if (!out || out !== g) return;
    while (nextLoop < a.c.currentTime + 1.0) nextLoop = scheduleLoop(a.c, g, t, nextLoop);
  };
  pump();
  timer = setInterval(pump, 250);
}

/** 브라우저 자동 재생 제한 때문에 첫 터치 뒤에 다시 시도할 수 있게 현재 곡을 잊는다 */
export function resetBgm() {
  const want = current;
  playBgm(null);
  return want;
}

export const SEASON_TRACK = (month: number): TrackId =>
  month >= 3 && month <= 5 ? 'SPRING' : month >= 6 && month <= 8 ? 'SUMMER' : month >= 9 && month <= 11 ? 'AUTUMN' : 'WINTER';
