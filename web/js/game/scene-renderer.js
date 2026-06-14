/**
 * SceneRenderer — 오프닝(opening-art) 비주얼 문법으로 *live 그리드*를 그리는 렌더러.
 *
 * 결정(2026-06-14, bm): 인게임을 오프닝에 맞춰 패치하는 게 아니라, 오프닝의 플레이/렌더
 * 시스템을 정식 시스템으로 삼고 부족한 것을 더해 완성한다. opening-art 가 그리기 SSOT.
 * (TilemapRenderer + dungeon-art.js 를 대체할 후보 — 1단계 프로토타입.)
 *
 * 오프닝이 "화면을 꽉 채우는" 비결은 큰 맵이 아니라 (1) 그리드 밖까지 던전 벽으로 메우고
 * (2) 플레이어 둘레 반경 밖을 포그로 녹이는 연출. 그래서 작은 맵(5×5)도 박스로 뜨지 않고
 * "어두운 던전 속 횃불 챔버"로 읽힌다 — 던전 크기·PPO 학습분포·캠페인 발란스 불변.
 *
 * 결정론: 좌표 시드 mulberry32 만 사용. Math.random/Date.now 금지. 애니메이션은 호출자가
 * 넘기는 now(시각) 의 sin 함수만 — 시드 노이즈와 무관 (오프닝과 동일 규약).
 *
 * 범위(프로토타입): 바닥/벽/림 + 분위기 포그 + 횃불 + 캐릭터 + 골 비콘. 오브젝트(골드/함정/
 * 몬스터/힐/구덩이/보물)·메커닉 포그·Q오버레이·멀티스테이지는 후속 단계에서 이식.
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
        // 시야 반경(px). 오프닝 기본 132 ≈ 5.5타일 ("real game's default vision").
        this.fogRadius = 132;
        // 바닥 팔레트 (오프닝 stone 계열)
        this.floor = PAL.stone;
        this.floorLight = PAL.stoneLight;
        this.floorHi = PAL.stoneHi;
    }

    setGrid(grid) { this.grid = grid; }
    setAgent(agent) { this.agent = agent; }

    // 그리드 밖 또는 WALL 타일 = 벽. 밖을 벽으로 처리해 프레임을 던전으로 메운다.
    _isWall(c, r) {
        const g = this.grid;
        if (!g || c < 0 || r < 0 || c >= g.width || r >= g.height) return true;
        return g.tiles[r][c] === TileType.WALL;
    }

    render(now = 0) {
        const { ctx, canvas, tile: ts } = this;
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
        ctx.restore();

        // 5. 분위기 포그 — 반경 밖을 어둠으로 녹임 (화면 좌표, 중앙 = 플레이어)
        drawFog(ctx, w, h, { x: w / 2, y: h / 2 }, this.fogRadius);

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
}
