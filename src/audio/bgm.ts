import { getAudio } from './sfx';

/**
 * 배경음악: 음원 파일 없이 Web Audio로 직접 연주하는 칩튠 6곡 (모두 이 게임을 위해 새로 쓴 곡).
 * v0.35: 반복 후크 멜로디 + 옥타브 베이스 + 16분음표 아르페지오 + 쿵·짝 드럼 + 메아리로 귀에 남게.
 * 멜로디는 [MIDI 음, 8분음표 길이] 목록, 코드는 마디마다 근음(MIDI).
 */
export type TrackId = 'TITLE' | 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'ENDING';

interface Track {
  bpm: number;
  lead: OscillatorType;
  /** [MIDI 음, 8분음표 길이] — 음 0은 쉼표 */
  melody: [number, number][];
  /** 마디(8분음표 8개)마다 코드 근음 */
  chords: number[];
  /** 마디별 화음: M 장조 · m 단조 (아르페지오용) */
  qual?: string;
  /** 베이스: 'octave' 8분음표 옥타브 통통 · 'pulse' 근음-5도 4분음표 · 'long' 마디 전체 */
  bass: 'octave' | 'pulse' | 'long';
  /** 드럼: 'pop' 쿵·짝 + 하이햇 · 'soft' 가벼운 쿵 + 하이햇 · 'none' */
  drums: 'pop' | 'soft' | 'none';
  /** 16분음표 화음 아르페지오 */
  arp?: boolean;
  /** 멜로디를 살짝 늦게 따라 부르는 메아리 */
  echo?: boolean;
}

const TRACKS: Record<TrackId, Track> = {
  // 제목 화면: 밝고 기억에 남는 후크 (같은 첫 마디가 두 번 돌아옴)
  TITLE: {
    bpm: 108, lead: 'square', bass: 'octave', drums: 'soft', arp: true, echo: true,
    melody: [
      [72, 1], [76, 1], [79, 1], [84, 1], [83, 2], [79, 2],
      [81, 2], [79, 1], [77, 1], [76, 4],
      [77, 1], [81, 1], [84, 1], [81, 1], [79, 2], [76, 2],
      [74, 2], [76, 1], [77, 1], [79, 4],
      [72, 1], [76, 1], [79, 1], [84, 1], [83, 2], [79, 2],
      [81, 2], [84, 1], [86, 1], [84, 4],
      [81, 1], [79, 1], [77, 1], [76, 1], [74, 2], [79, 2],
      [72, 4], [0, 4],
    ],
    chords: [48, 45, 53, 55, 48, 45, 53, 48],
    qual: 'MmMMMmMM',
  },
  // 봄: 통통 튀는 메인 테마 (가장 오래 듣는 곡) — "도미솔" 후크 반복
  SPRING: {
    bpm: 120, lead: 'square', bass: 'octave', drums: 'pop', arp: true, echo: true,
    melody: [
      [76, 1], [79, 1], [81, 2], [79, 1], [76, 1], [74, 2],
      [72, 1], [74, 1], [76, 2], [74, 4],
      [76, 1], [79, 1], [81, 2], [79, 1], [81, 1], [84, 2],
      [83, 2], [81, 2], [79, 4],
      [76, 1], [79, 1], [81, 2], [79, 1], [76, 1], [74, 2],
      [72, 1], [74, 1], [76, 2], [77, 2], [76, 1], [74, 1],
      [72, 2], [74, 1], [76, 1], [79, 2], [77, 1], [74, 1],
      [72, 4], [0, 4],
    ],
    chords: [48, 53, 55, 57, 48, 53, 55, 48],
    qual: 'MMMmMMMM',
  },
  // 여름: 빠르고 신나는 엇박 후크
  SUMMER: {
    bpm: 138, lead: 'square', bass: 'octave', drums: 'pop', arp: true, echo: true,
    melody: [
      [79, 1], [79, 1], [78, 1], [79, 1], [0, 1], [74, 1], [76, 2],
      [79, 1], [81, 1], [79, 1], [76, 1], [74, 4],
      [79, 1], [79, 1], [78, 1], [79, 1], [0, 1], [83, 1], [81, 2],
      [79, 1], [78, 1], [76, 1], [78, 1], [74, 4],
      [79, 1], [79, 1], [78, 1], [79, 1], [0, 1], [74, 1], [76, 2],
      [79, 1], [81, 1], [83, 1], [84, 1], [83, 2], [81, 2],
      [79, 2], [76, 1], [78, 1], [79, 1], [81, 1], [78, 2],
      [79, 4], [0, 4],
    ],
    chords: [43, 48, 50, 52, 43, 48, 50, 43],
    qual: 'MMMmMMMM',
  },
  // 가을: 살짝 아련하지만 리듬이 있는 단조
  AUTUMN: {
    bpm: 100, lead: 'triangle', bass: 'pulse', drums: 'soft', arp: true, echo: true,
    melody: [
      [69, 1], [72, 1], [76, 2], [74, 1], [72, 1], [71, 2],
      [69, 1], [71, 1], [72, 2], [76, 4],
      [77, 1], [76, 1], [74, 2], [72, 1], [71, 1], [69, 2],
      [71, 2], [72, 2], [74, 4],
      [69, 1], [72, 1], [76, 2], [74, 1], [72, 1], [71, 2],
      [69, 1], [71, 1], [72, 2], [76, 2], [79, 2],
      [77, 2], [76, 1], [74, 1], [72, 2], [71, 2],
      [69, 4], [0, 4],
    ],
    chords: [45, 52, 53, 48, 45, 52, 53, 45],
    qual: 'mmMMmmMm',
  },
  // 겨울: 반짝이는 오르골 느낌
  WINTER: {
    bpm: 92, lead: 'triangle', bass: 'long', drums: 'none', arp: true, echo: true,
    melody: [
      [77, 1], [81, 1], [84, 2], [82, 1], [81, 1], [79, 2],
      [77, 1], [79, 1], [81, 2], [82, 2], [81, 2],
      [82, 1], [84, 1], [86, 2], [84, 1], [82, 1], [81, 2],
      [79, 2], [77, 2], [76, 2], [77, 2],
      [77, 1], [81, 1], [84, 2], [82, 1], [81, 1], [79, 2],
      [77, 1], [79, 1], [81, 2], [84, 2], [86, 2],
      [84, 2], [82, 1], [81, 1], [79, 2], [76, 2],
      [77, 4], [0, 4],
    ],
    chords: [41, 48, 50, 46, 41, 48, 46, 41],
    qual: 'MMmMMMMM',
  },
  ENDING: {
    bpm: 72, lead: 'triangle', bass: 'long', drums: 'none', echo: true,
    melody: [
      [72, 4], [79, 4], [77, 2], [76, 2], [74, 4], [76, 4], [81, 4], [79, 8],
      [77, 4], [76, 2], [74, 2], [72, 2], [74, 2], [76, 4], [74, 4], [71, 2], [74, 2], [72, 8],
    ],
    chords: [48, 43, 45, 52, 41, 48, 43, 48],
  },
};

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const BGM_VOLUME = 0.26; // 드럼·아르페지오가 더해져 전체 음량은 조금 낮춤

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
  g.gain.value = 0.12;
  src.connect(f).connect(g).connect(dest);
  src.start(at);
}

function kick(c: AudioContext, dest: AudioNode, at: number, v: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, at);
  o.frequency.exponentialRampToValueAtTime(42, at + 0.12);
  g.gain.setValueAtTime(v, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + 0.18);
}

function snare(c: AudioContext, dest: AudioNode, at: number) {
  const len = Math.floor(c.sampleRate * 0.12);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1900;
  f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.value = 0.3;
  src.connect(f).connect(g).connect(dest);
  src.start(at);
}

/** 한 바퀴(8마디) 분량을 미리 예약 */
function scheduleLoop(c: AudioContext, dest: AudioNode, t: Track, start: number) {
  const e = 60 / t.bpm / 2; // 8분음표 길이(초)
  let pos = 0;
  const leadV = t.lead === 'square' ? 0.15 : 0.3;
  for (const [m, len] of t.melody) {
    if (m > 0) {
      note(c, dest, hz(m), start + pos * e, len * e * 0.92, t.lead, leadV);
      // 메아리: 16분음표 3개 늦게, 작게 → 따라 부르는 느낌
      if (t.echo) note(c, dest, hz(m) * 1.003, start + (pos + 1.5) * e, len * e * 0.8, t.lead === 'square' ? 'triangle' : 'sine', leadV * 0.32);
    }
    pos += len;
  }
  t.chords.forEach((root, bar) => {
    const b0 = start + bar * 8 * e;
    const minor = t.qual?.[bar] === 'm';
    if (t.bass === 'octave') {
      // 통통 튀는 옥타브 베이스 (낮은 근음 ↔ 한 옥타브 위)
      for (let k = 0; k < 8; k++) note(c, dest, hz(root - 12 + (k % 2 ? 12 : 0)), b0 + k * e, e * 0.85, 'triangle', k % 2 ? 0.24 : 0.36);
    } else if (t.bass === 'pulse') {
      [0, 7, 0, 7].forEach((iv, q) => note(c, dest, hz(root - 12 + iv), b0 + q * 2 * e, e * 1.6, 'triangle', 0.34));
    } else {
      note(c, dest, hz(root - 12), b0, e * 7.6, 'triangle', 0.3);
      note(c, dest, hz(root - 12 + 7), b0 + 4 * e, e * 3.6, 'sine', 0.16);
    }
    if (t.arp) {
      // 16분음표 화음 아르페지오 (근음·3도·5도·옥타브) — 칩튠 특유의 반짝임
      const iv = [0, minor ? 3 : 4, 7, 12];
      for (let k = 0; k < 16; k++) note(c, dest, hz(root + 12 + iv[k % 4]), b0 + (k * e) / 2, e * 0.42, 'square', 0.035);
    }
    if (t.drums !== 'none') {
      for (let k = 0; k < 8; k++) {
        const at = b0 + k * e;
        if (k === 0 || k === 4 || (t.drums === 'pop' && k === 5)) kick(c, dest, at, t.drums === 'pop' ? 0.55 : 0.35);
        if (t.drums === 'pop' && (k === 2 || k === 6)) snare(c, dest, at);
        if (k % 2 === 1 || t.drums === 'pop') hat(c, dest, at);
      }
    }
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
