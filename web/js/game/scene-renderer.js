/**
 * SceneRenderer — 오프닝(opening-art) 비주얼 문법으로 *live 그리드*를 그리는 렌더러.
 *
 * 결정(2026-06-14, bm): 인게임을 오프닝에 맞춰 패치하는 게 아니라, 오프닝의 플레이/렌더
 * 시스템을 정식 시스템으로 삼고 부족한 것을 더해 완성한다. opening-art 가 그리기 SSOT.
 * (단일스테이지 play 의 렌더러 — D-2026-06-15-1. dungeon-art.js 은퇴 예정.)
 *
 * 오프닝이 "화면을 꽉 채우는" 비결은 큰 맵이 아니라 (1) 그리드 밖까지 던전 벽으로 메우고
 * (2) 플레이어 둘레 반경 밖을 포그로 녹이는 연출. 그래서 작은 맵(5×5)도 박스로 뜨지 않고
 * "어두운 던전 속 횃불 챔버"로 읽힌다 — 던전 크기·PPO 학습분포·캠페인 발란스 불변.
 *
 * 결정론: 좌표 시드 mulberry32 만 사용. Math.random/Date.now 금지. 애니메이션은 호출자가
 * 넘기는 now(시각) 의 sin 함수만 — 시드 노이즈와 무관 (오프닝과 동일 규약).
 *
 * 범위(현행): 바닥/벽/림 + 분위기 포그 + 횃불 + 캐릭터 + 골 비콘 + 오브젝트(골드/함정/몬스터/
 * 힐/구덩이/보물). heavy_fog·dim_torch 의 시야 축소는 횃불 반경으로 표현(_visionRadius —
 * 기본 시야면 132 그대로, 좁으면 횃불이 조여든다). 탐색-메모리 '?' 트레일 포그·Q오버레이·
 * 멀티스테이지는 아직 TilemapRenderer 전용.
 */

import { TileType } from './tiles.js';
import {
    PAL, TILE, BASE_W, BASE_H,
    mulberry32, flecks, drawFog, drawTorch, drawCharacter,
} from './opening-art.js';

// 좌표 → 안정 시드 (셀별 노이즈 고정). dungeon-art.coordHash 와 동류, 의존성 없이 인라인.
function coordSeed(c, r) {
    let h = (c * 73856093) ^ (r * 19349663);
    return (h >>> 0) || 1;
}

const WALL_FILL = '#040303';                 // 오프닝 _drawWalls 의 solid-black interior
const RIM_TONES = ['#2a2520', '#382c20', '#4c3c2c', '#1a1610'];

export class SceneRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tile = TILE;                    // 24 — 오프닝과 동일 스케일
        this.canvas.width = BASE_W;          // 480
        this.canvas.height = BASE_H;         // 270
        this.grid = null;
        this.agent = null;
        // 시야 반경(px) 기준값 = 기본 시야(visibilityRange 5). 132 ≈ 5.5타일(132/TILE)이지만,
        // _visionRadius() 의 스케일은 "visibilityRange 1단위당 px"로 다룬다(타일 수가 아님).
        // 실제 렌더 반경은 _visionRadius() 가 에이전트 visibilityRange 에 연동해 산출(heavy_fog↓).
        this.fogRadius = 132;
        // 바닥 팔레트 (오프닝 stone 계열)
        this.floor = PAL.stone;
        this.floorLight = PAL.stoneLight;
        this.floorHi = PAL.stoneHi;
        // RendererRouter 가 전달하는 호환 프로퍼티 (3단계 전까지는 보관만 — 시각 미반영).
        this.fogOfWar = false;            // 라우터 호환용 보관. SceneRenderer 는 이 플래그가 아니라
                                          // agent.visibilityRange 로 시야를 좁힌다(_visionRadius). 트레일-메모리 '?' 포그는 미구현.
        this.carryingTreasure = false;
        this.treasurePosition = null;
        this.onAfterRender = null;        // 미니맵 훅 (mobile)
    }

    setGrid(grid) { this.grid = grid; }
    setAgent(agent) { this.agent = agent; }

    // 분위기 포그 반경(px) — 에이전트 visibilityRange(타일)에 연동. 기본 5 → fogRadius(132) 그대로라
    // 정상 플레이는 바이트동일. heavy_fog(3)·dim_torch(2)면 횃불이 조여들어 "시야가 좁다"가 그림에
    // 드러난다("dim torch" 판타지 = 좁은 횃불). 하한은 횃불 글로우(≈60px)가 숨쉴 여유.
    // ★ 렌더 전용 — visibilityRange 는 이미 sim(에이전트)이 쓰는 값이라 여기선 읽기만. PPO/결정론/발란스 불변.
    _visionRadius() {
        const range = (this.agent && this.agent.visibilityRange) || 5;
        const pxPerRange = this.fogRadius / 5;           // visibilityRange 1단위당 px (기본 range 5 = 132)
        return Math.max(64, Math.min(this.fogRadius, range * pxPerRange));
    }

    // 그리드 밖 또는 WALL 타일 = 벽. 밖을 벽으로 처리해 프레임을 던전으로 메운다.
    _isWall(c, r) {
        const g = this.grid;
        if (!g || c < 0 || r < 0 || c >= g.width || r >= g.height) return true;
        return g.tiles[r][c] === TileType.WALL;
    }

    render(now = 0) {
        const { ctx, canvas, tile: ts } = this;
        // 캔버스 소유권 재확보 — 같은 #game-canvas 를 공유하는 TilemapRenderer 가 직전에
        // grid 기반 크기로 바꿔놨을 수 있으므로 오프닝 스케일(480×270)로 되돌린다.
        // (canvas.width/height 대입은 비트맵을 리셋하지만, render() 가 어차피 전체 재도색)
        if (canvas.width !== BASE_W) canvas.width = BASE_W;
        if (canvas.height !== BASE_H) canvas.height = BASE_H;
        const w = canvas.width, h = canvas.height;

        // 1. 백드롭 — 카메라 밖/포그 너머는 깊은 흑색
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = PAL.black;
        ctx.fillRect(0, 0, w, h);
        if (!this.grid || !this.agent) return;

        // 2. 센터락 카메라 — 플레이어 타일을 화면 중앙에 고정 (오프닝 _drawDungeonScene 동일)
        const px = (this.agent.x + 0.5) * ts;
        const py = (this.agent.y + 0.5) * ts;
        const camX = Math.round(w / 2 - px);
        const camY = Math.round(h / 2 - py);

        // 3. 바닥/벽 — 카메라 변환 안. 화면에 보이는 타일 범위만(+1 여유) 그린다.
        ctx.save();
        ctx.translate(camX, camY);
        const cMin = Math.floor(-camX / ts) - 1, cMax = Math.floor((w - camX) / ts) + 1;
        const rMin = Math.floor(-camY / ts) - 1, rMax = Math.floor((h - camY) / ts) + 1;
        for (let r = rMin; r <= rMax; r++) {
            for (let c = cMin; c <= cMax; c++) {
                const x = c * ts, y = r * ts;
                if (this._isWall(c, r)) {
                    ctx.fillStyle = WALL_FILL;
                    ctx.fillRect(x, y, ts, ts);
                } else {
                    this._drawFloorTile(c, r, x, y, ts);
                }
            }
        }
        // 4. 림 — 벽을 마주한 바닥 가장자리에 픽셀 바위 (입체감)
        for (let r = rMin; r <= rMax; r++) {
            for (let c = cMin; c <= cMax; c++) {
                if (this._isWall(c, r)) continue;
                const x = c * ts, y = r * ts;
                if (this._isWall(c, r - 1)) this._rim(x, y, 'top', (c * 7 + r * 13) | 1);
                if (this._isWall(c, r + 1)) this._rim(x, y, 'bottom', (c * 11 + r * 5) | 1);
                if (this._isWall(c - 1, r)) this._rim(x, y, 'left', (c * 3 + r * 17) | 1);
                if (this._isWall(c + 1, r)) this._rim(x, y, 'right', (c * 19 + r * 2) | 1);
            }
        }
        // 4.5 오브젝트 — 바닥 위·분위기 포그 아래에 그린다. 반경 밖이면 포그가 가리고,
        // 다가가면 횃불에 드러난다(탐색 연출). 수집된 골드/처치 몬스터는 grid.tiles 가 이미
        // EMPTY 로 바뀌어 있어(reset 시 복원) 별도 가시성 상태 없이 grid 만 읽으면 정합.
        const g = this.grid;
        for (let r = rMin; r <= rMax; r++) {
            if (r < 0 || r >= g.height) continue;
            for (let c = cMin; c <= cMax; c++) {
                if (c < 0 || c >= g.width) continue;
                const t = g.tiles[r][c];
                if (t >= TileType.TRAP) this._drawObject(t, c * ts + ts / 2, r * ts + ts / 2, ts, now);
            }
        }
        // 4.6 보물 — treasurePosition (안 든 상태에서만). grid 타일이 아닌 별도 좌표.
        if (this.treasurePosition && !this.carryingTreasure) {
            this._drawTreasureGem((this.treasurePosition.x + 0.5) * ts, (this.treasurePosition.y + 0.5) * ts, ts, now);
        }
        ctx.restore();

        // 5. 분위기 포그 — 반경 밖을 어둠으로 녹임 (화면 좌표, 중앙 = 플레이어).
        //    반경은 시야(visibilityRange)에 연동 → heavy_fog 면 횃불이 조여든다.
        drawFog(ctx, w, h, { x: w / 2, y: h / 2 }, this._visionRadius());

        // 6. 횃불 — 플레이어가 든 빛 (포그를 뚫는 따뜻한 광). 시간 기반 깜빡임만.
        const flick = 0.92 + 0.1 * Math.sin(now / 140);
        drawTorch(ctx, w / 2, h / 2, flick);

        // 7. 캐릭터 — 항상 화면 중앙 (센터락)
        drawCharacter(ctx, w / 2, h / 2, 'player', ts);

        // 8. 골 비콘 — 포그 뒤에서도 보이는 먼 빛 ("저기로 가자" 랜드마크)
        if (this.grid.goalPos) {
            const gx = (this.grid.goalPos.x + 0.5) * ts + camX;
            const gy = (this.grid.goalPos.y + 0.5) * ts + camY;
            const pulse = 0.5 + 0.3 * Math.sin(now / 320);
            const beac = ctx.createRadialGradient(gx, gy, 1, gx, gy, 36);
            beac.addColorStop(0, `rgba(230,200,120,${0.55 * pulse})`);
            beac.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = beac;
            ctx.fillRect(gx - 44, gy - 44, 88, 88);
            drawCharacter(ctx, gx, gy, 'goal', ts);
        }

        // 9. 렌더 후 훅 — 미니맵 동기화(mobile). TilemapRenderer 와 동일 규약.
        if (this.onAfterRender) this.onAfterRender();
    }

    _drawFloorTile(c, r, x, y, ts) {
        const seed = coordSeed(c, r);
        flecks(this.ctx, x, y, ts, ts, this.floor, PAL.bgDeep, this.floorLight, seed, 0.2);
        // 가끔 밝은 stone 타일 (오프닝 drawDungeon 8% 규약)
        const rng = mulberry32(seed * 13);
        if (rng() < 0.08) {
            flecks(this.ctx, x + 1, y + 1, ts - 1, ts - 1,
                this.floorLight, PAL.bgDeep, this.floorHi, seed * 7, 0.18);
        }
        // 낮은 대비 타일 라인
        this.ctx.fillStyle = PAL.bgDeep;
        this.ctx.fillRect(x, y, 1, ts);
        this.ctx.fillRect(x, y, ts, 1);
    }

    _rim(x, y, side, seed) {
        const ctx = this.ctx, ts = this.tile;
        const rng = mulberry32(seed);
        for (let i = 0; i < ts; i += 2) {
            const d = 2 + Math.floor(rng() * 4);
            ctx.fillStyle = RIM_TONES[Math.floor(rng() * RIM_TONES.length)];
            if (side === 'top') ctx.fillRect(x + i, y, 2, d);
            else if (side === 'bottom') ctx.fillRect(x + i, y + ts - d, 2, d);
            else if (side === 'left') ctx.fillRect(x, y + i, d, 2);
            else if (side === 'right') ctx.fillRect(x + ts - d, y + i, d, 2);
        }
    }

    // 작은 방사 글로우 (오브젝트 강조 — gold/heal/monster/treasure 공용)
    _glow(cx, cy, rad, rgb, alpha) {
        const ctx = this.ctx;
        const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
        g.addColorStop(0, `rgba(${rgb},${alpha})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    // 오브젝트 도트 — opening-art idiom(8px 그리드, 솔리드 토널 블록 + 글린트). 결정론:
    // 좌표/시드 노이즈 없이 고정 형태 + now 기반 sin 글로우만(오프닝 횃불·골 비콘과 동일 규약).
    _drawObject(type, cx, cy, ts, now) {
        const ctx = this.ctx, px = ts / 8;
        const x0 = Math.floor(cx - ts / 2), y0 = Math.floor(cy - ts / 2);
        const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };

        if (type === TileType.GOLD) {                       // 금화 더미 (+10)
            const pulse = 0.8 + 0.2 * Math.sin(now / 260);
            this._glow(cx, cy + px, ts * 0.5, '230,200,120', 0.26 * pulse);
            R(x0 + 2 * px, y0 + 5 * px, 4 * px, 1.5 * px, PAL.accentDim);
            R(x0 + 2 * px, y0 + 4 * px, 4 * px, 1.5 * px, PAL.accent);
            R(x0 + 3 * px, y0 + 3 * px, 2 * px, 1.2 * px, PAL.accentHi);
            R(x0 + 3.5 * px, y0 + 3 * px, px, px, '#fff7e0');               // glint
        } else if (type === TileType.TRAP) {                // 금속 스파이크 (-10, 비치명)
            R(x0 + 2 * px, y0 + 5 * px, 4 * px, px, PAL.stoneHi);           // base plate
            R(x0 + 2 * px, y0 + 5.8 * px, 4 * px, 0.6 * px, PAL.bgDeep);
            R(x0 + 2 * px, y0 + 3 * px, px, 2 * px, '#9a4636');             // spikes (rust-red)
            R(x0 + 3.5 * px, y0 + 2.5 * px, px, 2.5 * px, '#9a4636');
            R(x0 + 5 * px, y0 + 3 * px, px, 2 * px, '#9a4636');
            R(x0 + 3.5 * px, y0 + 2.5 * px, 0.5 * px, px, '#c86a55');       // lit edge
        } else if (type === TileType.PIT) {                 // 즉사 구덩이 — 바닥의 검은 구멍
            R(x0 + 1.5 * px, y0 + 2 * px, 5 * px, 4.5 * px, PAL.bgDeep);    // rim
            ctx.fillStyle = PAL.black;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 0.3 * px, 2.3 * px, 1.9 * px, 0, 0, Math.PI * 2);
            ctx.fill();
            R(x0 + 2.2 * px, y0 + 2.1 * px, 2 * px, 0.5 * px, '#2a211a');   // faint top rim light
        } else if (type === TileType.HEAL) {                // 분홍 회복 크리스탈
            const pulse = 0.7 + 0.3 * Math.sin(now / 300);
            this._glow(cx, cy, ts * 0.55, '244,160,200', 0.2 * pulse);
            R(x0 + 3 * px, y0 + 2.5 * px, 2 * px, 4 * px, '#d96fa0');       // vertical
            R(x0 + 2 * px, y0 + 3.5 * px, 4 * px, 2 * px, '#d96fa0');       // horizontal (+ 표식)
            R(x0 + 3 * px, y0 + 2.5 * px, px, 4 * px, '#f4a8cc');           // lit
            R(x0 + 3 * px, y0 + 5.5 * px, 2 * px, px, '#a04a73');           // shadow
        } else if (type === TileType.MONSTER) {             // 작은 위협 생물 (데미지 30)
            const eg = 0.7 + 0.3 * Math.sin(now / 180);
            R(x0 + 2 * px, y0 + 3 * px, 4 * px, 4 * px, '#3a2746');         // body
            R(x0 + 2 * px, y0 + 6 * px, 4 * px, px, '#251830');            // bottom shadow
            R(x0 + 1.5 * px, y0 + 3.5 * px, px, 2 * px, '#3a2746');         // bulges
            R(x0 + 5.5 * px, y0 + 3.5 * px, px, 2 * px, '#3a2746');
            R(x0 + 2.5 * px, y0 + 2 * px, px, px, '#251830');              // horns
            R(x0 + 4.5 * px, y0 + 2 * px, px, px, '#251830');
            R(x0 + 3 * px, y0 + 4 * px, px, px, '#d06ae0');                // glowing eyes
            R(x0 + 4.5 * px, y0 + 4 * px, px, px, '#d06ae0');
            this._glow(cx, cy, ts * 0.4, '160,80,200', 0.15 * eg);
        }
    }

    // 보물 보석 — 골드 다이아몬드 + 강한 글로우. 발견형(discovery): 카메라 변환 안 + 분위기
    // 포그 *이전*에 그려져, 멀리선 포그에 가리고 다가가야 횃불에 드러난다(골드/몬스터 등 오브젝트와
    // 동일 연출). 포그를 뚫는 골 비콘과 달리 "멀리서 보이는 랜드마크"가 아님 — D-2026-06-15-1 (bm).
    _drawTreasureGem(cx, cy, ts, now) {
        const ctx = this.ctx, px = ts / 8;
        const pulse = 0.6 + 0.4 * Math.sin(now / 300);
        this._glow(cx, cy, ts * 0.9, '230,181,98', 0.5 * pulse);
        ctx.save();
        ctx.translate(Math.round(cx), Math.round(cy));
        ctx.fillStyle = PAL.accentHi;
        ctx.beginPath();
        ctx.moveTo(0, -3 * px); ctx.lineTo(2.4 * px, 0); ctx.lineTo(0, 3 * px); ctx.lineTo(-2.4 * px, 0); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PAL.accent;                                       // facet (어두운 절반)
        ctx.beginPath();
        ctx.moveTo(0, -3 * px); ctx.lineTo(2.4 * px, 0); ctx.lineTo(0, 0); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff7e0';
        ctx.fillRect(Math.round(-0.5 * px), Math.round(-2 * px), Math.max(1, Math.round(px)), Math.max(1, Math.round(px)));
        ctx.restore();
    }
}
