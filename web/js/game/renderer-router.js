/**
 * RendererRouter — 단일 #game-canvas 위에서 두 렌더러를 상황별로 라우팅하는 래퍼.
 *
 * 결정(2026-06-14→15, bm): "오프닝 = 정식 플레이 시스템". 단일스테이지 *수동 play* 는
 * opening-art 기반 SceneRenderer 로, 그 외(dev/training/editor/멀티스테이지)는 기존
 * TilemapRenderer 로 그린다. main.js / editor.js 호출부는 단일 this.renderer 를 그대로
 * 쓰고(호출부 무변경), 라우팅·캔버스 소유권 충돌 방지는 전부 이 래퍼 안에 격리한다.
 * → 점진 교체이자 되돌리기 쉬움(이 파일 제거 + 생성자 1줄 환원이면 원복).
 *
 * 라우팅 신호 = syncCamera·화면전환 훅의 setScene(useScene). useScene===true ⟺
 *   "screen-play && !멀티스테이지 && !training" = SceneRenderer 케이스. (Q-viz 체크박스·
 *   follow·showQ·showPolicy 와 무관 — dev 기본 ON 인 Q-viz 에 묶이지 않게 분리한 게 핵심.)
 * follow(setCameraFollow)는 이제 TilemapRenderer 시네마틱 카메라(dev 단일스테이지)만 제어하고,
 *   scene 활성 동안 _syncTile 이 그 follow 를 꺼서 두 렌더러가 같은 #game-canvas 를 두고
 *   RAF 로 덧그리며 다투지 못하게 한다.
 *
 * 범위(현행): 단일스테이지 play = SceneRenderer (바닥/벽/림 + 분위기 포그 + 횃불 + 오브젝트 +
 *   보물 + 미니맵 훅, 2091c89). 멀티스테이지 크롭·RL Q오버레이·메커닉(탐색-메모리) 포그는 아직
 *   TilemapRenderer 전용 — SceneRenderer 포팅은 후속(blocker 아님).
 */

import { TilemapRenderer } from './tilemap-renderer.js';
import { SceneRenderer } from './scene-renderer.js';

export class RendererRouter {
    constructor(canvas) {
        this.canvas = canvas;
        this._tile = new TilemapRenderer(canvas);
        this._scene = new SceneRenderer(canvas);
        this._useScene = false;            // 기본 = TilemapRenderer (title / dev / editor / 초기)
        this._tileFollow = false;          // TilemapRenderer 시네마틱 follow 의도 (dev 단일스테이지 잔존)
        this._tileVt = undefined;
    }

    get active() { return this._useScene ? this._scene : this._tile; }

    // ── 라우팅 스위치 ──
    // setScene(true) ⟺ "클린 플레이 화면(screen-play)의 단일스테이지" = SceneRenderer 케이스.
    // (Q-viz 체크박스/모디파이어와 무관 — syncCamera·화면전환 훅이 화면+단일스테이지로 결정)
    setScene(useScene) {
        this._useScene = !!useScene;
        this._syncTile();
    }

    // TilemapRenderer 의 follow 카메라 의도 보관 (dev 워크벤치 단일스테이지 시네마틱 잔존).
    // syncCamera 가 기존처럼 호출 — scene 활성 동안엔 _syncTile 이 tilemap follow 를 꺼서
    // 같은 #game-canvas 를 두고 RAF 로 다투지 못하게 한다.
    setCameraFollow(follow, vt) {
        this._tileFollow = !!follow;
        this._tileVt = vt;
        this._syncTile();
    }

    _syncTile() {
        this._tile.setCameraFollow(this._useScene ? false : this._tileFollow, this._tileVt);
    }

    // ── 상태 setter: 양쪽에 전달해 활성 렌더러가 항상 최신 상태 ──
    setGrid(grid) { this._tile.setGrid(grid); this._scene.setGrid(grid); }
    setAgent(agent) { this._tile.setAgent(agent); this._scene.setAgent(agent); }

    // ── 멀티스테이지 크롭 = TilemapRenderer 전용 (SceneRenderer 는 단일스테이지만) ──
    setViewportStage(stage) { this._tile.setViewportStage(stage); }

    // ── RL 시각화 = dev/training 전용 → TilemapRenderer ──
    setQData(values, policy) { this._tile.setQData(values, policy); }

    // ── flash = DOM 오버레이(렌더러·캔버스 무관) → TilemapRenderer 구현 재사용 ──
    flash(color, duration) { this._tile.flash(color, duration); }

    render(now) { this.active.render(now); }

    // ── pass-through 프로퍼티 ──
    get tileSize() { return this._tile.tileSize; }          // editor 좌표 매핑용 (editor=tilemap)

    // dev/training 전용 시각화 토글 → tile 만 (scene 미사용)
    set showQValues(v) { this._tile.showQValues = v; }
    get showQValues() { return this._tile.showQValues; }
    set showPolicy(v) { this._tile.showPolicy = v; }
    get showPolicy() { return this._tile.showPolicy; }
    set cameraClamp(v) { this._tile.cameraClamp = v; }
    get cameraClamp() { return this._tile.cameraClamp; }

    // 시각 상태 — 양쪽에 보관 (SceneRenderer 는 3단계에서 소비, 현재는 무해 보관)
    set fogOfWar(v) { this._tile.fogOfWar = v; this._scene.fogOfWar = v; }
    get fogOfWar() { return this._tile.fogOfWar; }
    set carryingTreasure(v) { this._tile.carryingTreasure = v; this._scene.carryingTreasure = v; }
    get carryingTreasure() { return this._tile.carryingTreasure; }
    set treasurePosition(v) { this._tile.treasurePosition = v; this._scene.treasurePosition = v; }
    get treasurePosition() { return this._tile.treasurePosition; }
    set onAfterRender(fn) { this._tile.onAfterRender = fn; this._scene.onAfterRender = fn; }
    get onAfterRender() { return this._tile.onAfterRender; }
}
