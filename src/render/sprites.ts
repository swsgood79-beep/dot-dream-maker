/**
 * 코드로 정의한 도트 스프라이트 (외부 이미지 파일 없음).
 * - PALETTE: 한 글자 = 한 색
 * - FURNITURE_PIXELS: 가구 아이콘 8x8 매트릭스 ('.' = 투명)
 * - FURNITURE_BODY: 아이소메트릭 직육면체 본체의 색/높이
 */
export const PALETTE: Record<string, string> = {
  k: '#1b1f3b', // 외곽선
  w: '#ffffff',
  l: '#c9ced6',
  s: '#7a8290',
  n: '#8a5a35', // 갈색
  t: '#c48a52', // 황갈색
  r: '#e5484d',
  o: '#ff9f43',
  y: '#ffd84d',
  g: '#5bd6a8',
  d: '#2e8b57',
  b: '#4a7bd8',
  c: '#8fe3ff',
  p: '#9b6bd8',
  m: '#ff8fc0',
  e: '#2b2f5c',
  f: '#f2c9a0', // 살색
};

export const FURNITURE_PIXELS: Record<string, string[]> = {
  basic_bed: ['........', '........', 'ww......', 'wwmmmmmm', 'nmmmmmmm', 'nnnnnnnn', 'n......n', '........'],
  globe: ['..kkkk..', '.kbgbbk.', 'kbggbbbk', 'kbbbggbk', '.kbbggk.', '..kkkk..', '...nn...', '..nnnn..'],
  plant: ['..d..g..', '.dgd.gd.', '..gdgdg.', '.dgdgd..', '...dg...', '..nnnn..', '..nttn..', '...nn...'],
  toy_box: ['.tt..tt.', '.tnttnt.', '..tttt..', '.tkttkt.', '..tmmt..', '.tttttt.', '.tt..tt.', '........'],
  oak_desk: ['........', '........', 'tttttttt', 'nnnnnnnn', 'n.n..nnn', 'n.n..nwn', 'n.n..nnn', 'n.n..n.n'],
  encyclopedia_shelf: ['nnnnnnnn', 'nrbygrpn', 'nrbygrpn', 'nnnnnnnn', 'nbgrybmn', 'nbgrybmn', 'nnnnnnnn', 'n......n'],
  led_lamp: ['..kkkk..', '.kwwwwk.', 'kyyyyyyk', '....k...', '....k...', '....k...', '...kkk..', '..kkkkk.'],
  anatomy_model: ['...ww...', '..wkkw..', '..wwww..', '.rwwwwb.', '.rrwwbb.', '..rrbb..', '...ss...', '..ssss..'],
  microscope_table: ['..kk....', '..ks....', '...ks...', '..kkkk..', '...ks.k.', '..kkkkk.', 'tttttttt', 'n......n'],
  medical_shelf: ['nnnnnnnn', 'ngwgwgwn', 'ngrgwgrn', 'nnnnnnnn', 'nwgwgwgn', 'nwgrgwgn', 'nnnnnnnn', 'n......n'],
  gaming_pc: ['kkkkk...', 'kcccck..', 'kcbcck.k', 'kcccck.k', 'kkkkk.mk', '..k...gk', '.kkk..bk', '......kk'],
  dual_monitor: ['kkkkkkkk', 'kcckccck', 'kcbkcbck', 'kcckccck', 'kkkkkkkk', '...kk...', '..kkkk..', '........'],
  whiteboard: ['kkkkkkkk', 'kwwwwwwk', 'kwbwrwwk', 'kwwbwwgk', 'kwwwwwwk', 'kkkkkkkk', '.k....k.', 'k......k'],
  grand_piano: ['.kkkkk..', 'kkkkkkk.', 'kkkkkkkk', 'wkwkwkwk', 'wwwwwwww', 'k.....k.', 'k.....k.', '........'],
  condenser_mic: ['..kkkk..', '.klslsk.', '.kslslk.', '.klslsk.', '..kkkk..', '...kk...', '...kk...', '..kkkk..'],
  sound_booth: ['ssssssss', 'skkkkkks', 'skpkpkks', 'skkpkpks', 'skpkpkks', 'skkkkkks', 'ssssssss', 's......s'],
  easel: ['...n....', '.wwwwww.', '.wcbmyw.', '.wgcbyw.', '.wwwwww.', '..n..n..', '.n....n.', 'n......n'],
  plaster_bust: ['..wwww..', '.wwwwlw.', '.wkwkww.', '.wwwwlw.', '..wllw..', '.lwwwwl.', '.ssssss.', '.ssssss.'],
  watercolor_kit: ['........', '........', 'kkkkkkkk', 'krybgpmk', 'kwwwwwwk', 'kkkkkkkk', '...n....', '....n...'],
  treadmill: ['......k.', '......k.', '.....kk.', '.....k..', '.....k..', 'kkkkkkk.', 'ksssssk.', 'kkkkkkk.'],
  dumbbell_rack: ['........', 'kk....kk', 'kkssssk.', 'kk....kk', 'nnnnnnnn', 'kk....kk', 'kkssssk.', 'n......n'],
  full_mirror: ['.nnnnnn.', '.nccwcn.', '.ncwccn.', '.nwcccn.', '.ncccwn.', '.nccwcn.', '.nnnnnn.', '..n..n..'],
  newspaper_stand: ['.wwwwww.', '.wkkkkw.', '.wwwwww.', '.wkwkkw.', '.wkkwkw.', '.wwwwww.', '...nn...', '..nnnn..'],
  world_clock: ['..kkkk..', '.kwwwwk.', 'kwwkwwwk', 'kwwkwwwk', 'kwwkkkwk', 'kwwwwwwk', '.kwwwwk.', '..kkkk..'],
  stock_monitor: ['kkkkkkkk', 'keeeeeek', 'keeeeegk', 'keeeegek', 'kerege.k', 'kerreeek', 'kkkkkkkk', '...kk...'],
  mini_oven: ['ssssssss', 'skkkkkss', 'skoookks', 'skooookl', 'skkkkkss', 'ssssssss', 's......s', '........'],
  kitchen_counter: ['........', '.kk.....', 'kssk..s.', '.kk..sss', 'llllllll', 'wwwwwwww', 'wnwwwwnw', 'wwwwwwww'],
  spice_rack: ['nnnnnnnn', '.r.y.g..', 'rr.yy.gg', 'nnnnnnnn', '.o.m.d..', 'oo.mm.dd', 'nnnnnnnn', '........'],
  ring_light: ['..kkkk..', '.kwwwwk.', 'kww..wwk', 'kw....wk', 'kww..wwk', '.kwwwwk.', '..kkkk..', '...kk...'],
  broadcast_cam: ['........', 'kkkkk...', 'ksssskkk', 'ksssskck', 'ksrsskkk', 'kkkkk...', '..k.k...', '.k...k..'],
  chroma_key: ['kkkkkkkk', 'kggggggk', 'kggggggk', 'kggggggk', 'kggggggk', 'kggggggk', 'kkkkkkkk', 'k......k'],
  telescope: ['......kk', '.....kbk', '....kbk.', '...kbk..', '..kbk...', '...k....', '..k.k...', '.k...k..'],
  planet_model: ['........', '..kkkk..', '.koooyk.', 'pkoyookp', '.pkkkkp.', '..pppp..', '...nn...', '..nnnn..'],
  zero_g_bed: ['..cccc..', '.ckkkkc.', 'ckwwwwkc', 'ckwmmwkc', 'ckwwwwkc', '.ckkkkc.', '..cccc..', '.ss..ss.'],
  fluffy_bed: ['ww......', 'wwmmmmmm', 'mmmmmmmm', 'mwmmwmmm', 'mmmmmmmm', 'tttttttt', 't......t', '........'],
  aroma_diffuser: ['...l....', '..l.l...', '...l....', '..pppp..', '.pwwwwp.', '.pwwwwp.', '..pppp..', '........'],
  cat_cushion: ['........', '.o...o..', '.oo.oo..', '.ooooo..', '.okook..', 'mmooommm', 'mmmmmmmm', '.mmmmmm.'],
  treasure_chest: ['........', '.nnnnnn.', 'nyyyyyyn', 'nnnnnnnn', 'nnnyynnn', 'nnnkknnn', 'nnnnnnnn', '.n....n.'],
  wooden_sword_rack: ['..t..t..', '..t..t..', '..t..t..', 'nnnnnnnn', '..t..t..', '.ntn.ntn', '.nnn.nnn', 'n......n'],
  magic_rug: ['........', '........', '..pppp..', '.pyppyp.', 'ppypyppp', '.pyppyp.', '..pppp..', '........'],
};

export interface BodySpec {
  color: string; // 본체 기본색
  h: number; // 직육면체 높이(px, 논리 해상도)
}

/** 가구 본체 (직육면체) 색/높이. 아이콘은 본체 윗면 위에 서 있는 스프라이트로 그린다 */
export const FURNITURE_BODY: Record<string, BodySpec> = {
  basic_bed: { color: '#c48a52', h: 6 },
  globe: { color: '#8a5a35', h: 6 },
  plant: { color: '#c48a52', h: 3 },
  toy_box: { color: '#ff8fc0', h: 8 },
  oak_desk: { color: '#b07642', h: 12 },
  encyclopedia_shelf: { color: '#8a5a35', h: 16 },
  led_lamp: { color: '#b07642', h: 10 },
  anatomy_model: { color: '#c9ced6', h: 6 },
  microscope_table: { color: '#b07642', h: 12 },
  medical_shelf: { color: '#8a5a35', h: 16 },
  gaming_pc: { color: '#3a3f6b', h: 12 },
  dual_monitor: { color: '#3a3f6b', h: 12 },
  whiteboard: { color: '#c9ced6', h: 8 },
  grand_piano: { color: '#2b2f3b', h: 10 },
  condenser_mic: { color: '#7a8290', h: 4 },
  sound_booth: { color: '#6b5a8a', h: 20 },
  easel: { color: '#c48a52', h: 4 },
  plaster_bust: { color: '#e8e8e8', h: 10 },
  watercolor_kit: { color: '#b07642', h: 10 },
  treadmill: { color: '#7a8290', h: 4 },
  dumbbell_rack: { color: '#5a6070', h: 6 },
  full_mirror: { color: '#c48a52', h: 4 },
  newspaper_stand: { color: '#8a5a35', h: 6 },
  world_clock: { color: '#8a5a35', h: 10 },
  stock_monitor: { color: '#3a3f6b', h: 12 },
  mini_oven: { color: '#c9ced6', h: 10 },
  kitchen_counter: { color: '#f0f0f0', h: 12 },
  spice_rack: { color: '#b07642', h: 10 },
  ring_light: { color: '#7a8290', h: 4 },
  broadcast_cam: { color: '#7a8290', h: 4 },
  chroma_key: { color: '#2e8b57', h: 4 },
  telescope: { color: '#4a4f7b', h: 4 },
  planet_model: { color: '#8a5a35', h: 8 },
  zero_g_bed: { color: '#8fe3ff', h: 8 },
  fluffy_bed: { color: '#ffb3d1', h: 7 },
  aroma_diffuser: { color: '#b07642', h: 8 },
  cat_cushion: { color: '#ff8fc0', h: 3 },
  treasure_chest: { color: '#8a5a35', h: 4 },
  wooden_sword_rack: { color: '#8a5a35', h: 6 },
  magic_rug: { color: '#6b3fa0', h: 1 },
};

/** 색 밝기 조절 (#rrggbb, amt: -1 ~ 1) */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(Math.max(0, Math.min(255, amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** 8x8 매트릭스를 컨텍스트에 그린다 (scale = 1 도트당 px) */
export function drawPixels(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, scale = 1) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const col = PALETTE[row[c]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x + c * scale), Math.round(y + r * scale), scale, scale);
    }
  }
}

const iconCache = new Map<string, string>();
/** UI용 도트 아이콘 dataURL (상점/창고 목록) */
export function pixelIconUrl(id: string): string {
  const cached = iconCache.get(id);
  if (cached) return cached;
  const rows = FURNITURE_PIXELS[id];
  if (!rows || typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = 8;
  cv.height = 8;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  drawPixels(ctx, rows, 0, 0, 1);
  const url = cv.toDataURL();
  iconCache.set(id, url);
  return url;
}
