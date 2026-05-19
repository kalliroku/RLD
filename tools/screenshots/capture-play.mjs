// B-208.1 본격 스크린샷 자동화 — Chrome DevTools Protocol WebSocket 직접 호출
// 의존성 0 (node 22 내장 WebSocket 사용). Chrome 148+ headless + dev server 필요.
//
// 사용법:
//   1) cd web && python3 -m http.server 8765 &
//   2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//        --headless=new --remote-debugging-port=9222 \
//        --user-data-dir=/tmp/rld-chrome-profile --no-first-run \
//        --disable-extensions about:blank &
//   3) node tools/screenshots/capture-play.mjs
//   4) pkill -f "remote-debugging-port=9222"; pkill -f "http.server 8765"
//
// 산출: web/assets/screenshots/play-{training,daily,party,quest,gameover,daily-mobile}.png
// 산출 6장 + 기존 dev artifact 4장 (landing-* / play-title*, commit 880ad07) 별도 보존.
//
// 진입 핵심:
//   - 캔버스/오버레이는 screen-dev 안 (screen-guild 는 quest/party/shop/map 탭만)
//   - trainingSpeed = 0 (instant) 가 동기 루프로 5×5 던전 ~20 episodes 만에 수렴
//   - 학습 종료 후 renderer.{fogOfWar=false, showQValues=true, render()} 명시 호출
//   - localStorage rld_tutorial preseed 로 첫 진입 토스트 차단
//
// 산출 경로는 절대경로 (RLD repo 가 다른 위치면 OUT 한 줄 수정).

import { writeFile } from 'node:fs/promises';

const PORT = 9222;
const BASE = 'http://localhost:8765/play.html';
const OUT = '/Users/bm/RLD/web/assets/screenshots';

const targets = await fetch(`http://localhost:${PORT}/json/list`).then(r => r.json());
const target = targets.find(t => t.type === 'page');
if (!target) throw new Error('No page target');
console.log('[cdp] target:', target.url);

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
const eventHandlers = new Map();

ws.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(`${data.method || ''}: ${data.error.message}`));
    else resolve(data.result);
  } else if (data.method && eventHandlers.has(data.method)) {
    for (const h of eventHandlers.get(data.method)) h(data.params);
  }
});

const onEvent = (method, handler) => {
  if (!eventHandlers.has(method)) eventHandlers.set(method, new Set());
  eventHandlers.get(method).add(handler);
  return () => eventHandlers.get(method).delete(handler);
};

await new Promise((r, rej) => {
  ws.addEventListener('open', r);
  ws.addEventListener('error', rej);
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await send('Page.enable');
await send('Runtime.enable');

async function setViewport(width, height, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', {
    width, height,
    deviceScaleFactor: 2,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
}

async function navigate(url) {
  // First navigate to about:blank so we can seed localStorage on the actual origin,
  // then navigate to BASE. localStorage is per-origin so we seed after we land on the origin once.
  const loaded = new Promise(resolve => {
    const off = onEvent('Page.loadEventFired', () => { off(); resolve(); });
  });
  await send('Page.navigate', { url });
  await loaded;
  // Seed localStorage immediately (re-runs harmless), then reload once to re-render init flow without welcome tip
  await send('Runtime.evaluate', { expression: PRESEED_LOCALSTORAGE });
  await send('Page.reload');
  await new Promise(resolve => {
    const off = onEvent('Page.loadEventFired', () => { off(); resolve(); });
  });
  await sleep(900);
  for (let i = 0; i < 20; i++) {
    const r = await send('Runtime.evaluate', { expression: 'typeof window.game !== "undefined" && !!window.game' });
    if (r.result.value) break;
    await sleep(150);
  }
}

async function evalExpr(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) {
    console.error('[eval]', r.exceptionDetails.text);
    console.error('  expr:', expression.slice(0, 300));
    throw new Error('eval failed');
  }
  return r.result?.value;
}

async function screenshot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const path = `${OUT}/${name}`;
  await writeFile(path, Buffer.from(r.data, 'base64'));
  console.log('[shot]', path);
}

// Helpers
const DISMISS_TOASTS = `
  document.querySelectorAll('.tutorial-tip, .toast, #toast-container .toast').forEach(el => el.remove());
`;

// Pre-seed localStorage so first-time tutorial / welcome tip does not fire.
// rld_tutorial stores array of completed step ids; rld_save_data lets continue/new game flow be deterministic.
const PRESEED_LOCALSTORAGE = `
  localStorage.setItem('rld_tutorial', JSON.stringify(['welcome','move','goal','train','reward']));
`;

const ENTER_FROM_TITLE = `
  document.getElementById('btn-new-game').click();
`;

// ============== Scenario flow ==============

// 1. 학습 시각화 — Q-heatmap + sparkline (desktop, screen-dev play mode)
async function shotTraining() {
  console.log('\n=== 1. 학습 시각화 ===');
  await setViewport(1280, 800);
  await navigate(BASE);
  await evalExpr(ENTER_FROM_TITLE);
  await sleep(300);
  // jump straight into dev screen (canvas + training UI)
  await evalExpr(`
    window.game.screenManager.show('screen-dev');
    window.game.showQValuesCheck.checked = true;
    window.game.renderer.showQValues = true;
    window.game.trainingSpeed = 0;
    window.game.loadDungeon('level_01_easy');
  `);
  await sleep(300);
  await evalExpr(`window.game.startTraining()`);
  // poll for sufficient episodes. instant loop yields every 10 episodes (batchSize)
  let lastEp = 0;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const ep = await evalExpr(`window.game.trainingEpisode || 0`);
    const training = await evalExpr(`!!window.game.isTraining`);
    if (i === 0 || i % 4 === 0) console.log(`  poll[${i}] ep=${ep} training=${training}`);
    lastEp = ep;
    if (!training) { console.log('  training auto-finished at', ep); break; }
    if (ep >= 150) break;
  }
  // Force Q-heatmap visualization on (training finished restored fog)
  await evalExpr(`
    window.game.renderer.fogOfWar = false;
    window.game.renderer.showQValues = true;
    window.game.renderer.render();
  `);
  await sleep(400);
  await evalExpr(DISMISS_TOASTS);
  await screenshot('play-training.png');
  await evalExpr(`window.game.stopTraining?.()`);
  console.log('  final episodes:', lastEp);
}

// 2. 모디파이어 데일리 (desktop) — daily intro phase with modifier band + chips
async function shotDaily() {
  console.log('\n=== 2. 모디파이어 데일리 ===');
  await setViewport(1280, 800);
  await navigate(BASE);
  await evalExpr(ENTER_FROM_TITLE);
  await sleep(300);
  await evalExpr(`
    window.game.screenManager.show('screen-dev');
    window.game.switchMode('daily');
  `);
  await sleep(900);
  await evalExpr(DISMISS_TOASTS);
  await screenshot('play-daily.png');
}

// 3. 캐릭터 다양성 — party tab (already worked, just dismiss toast)
async function shotParty() {
  console.log('\n=== 3. 캐릭터 다양성 ===');
  await setViewport(1280, 800);
  await navigate(BASE);
  await evalExpr(ENTER_FROM_TITLE);
  await sleep(300);
  await evalExpr(`
    const tabs = document.querySelectorAll('.guild-tab');
    tabs.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.guild-tab-panel').forEach(p => p.classList.remove('active'));
    const partyBtn = Array.from(tabs).find(b => (b.dataset.tab === 'party') || /파티|party/i.test(b.textContent));
    if (partyBtn) partyBtn.classList.add('active');
    const panel = document.getElementById('guild-tab-party');
    if (panel) panel.classList.add('active');
    window.game._updateGuildParty?.();
  `);
  await sleep(400);
  await evalExpr(DISMISS_TOASTS);
  await screenshot('play-party.png');
}

// 4. 던전 다양성 — quest tab (default)
async function shotQuest() {
  console.log('\n=== 4. 던전 다양성 ===');
  await setViewport(1280, 800);
  await navigate(BASE);
  await evalExpr(ENTER_FROM_TITLE);
  await sleep(300);
  await evalExpr(DISMISS_TOASTS);
  await sleep(200);
  await screenshot('play-quest.png');
}

// 5. 게임오버 오버레이 (desktop, screen-dev)
async function shotGameOver() {
  console.log('\n=== 5. 게임오버 ===');
  await setViewport(1280, 800);
  await navigate(BASE);
  await evalExpr(ENTER_FROM_TITLE);
  await sleep(300);
  await evalExpr(`
    window.game.screenManager.show('screen-dev');
    window.game.loadDungeon('level_01_easy');
    // Clear training-fog leftover so dungeon shows as fresh
    window.game.renderer.fogOfWar = true;
    window.game.renderer.showQValues = false;
    window.game.renderer.render();
    // Reset death count to show a clean 1/4 (not the limit-reached path)
    if (window.game.runState) {
      window.game.runState.deathCount = 0;
      window.game.runState.saveRunState();
    }
    window.game.triggerGameOver('HP가 0이 되었습니다. 길드장이 쓰러졌습니다.');
  `);
  await sleep(600);
  await evalExpr(DISMISS_TOASTS);
  await screenshot('play-gameover.png');
}

// 6. 모바일 — daily mode at 420 (showcase mobile fit + modifier band)
async function shotMobile() {
  console.log('\n=== 6. 모바일 (daily intro) ===');
  await setViewport(420, 900, true);
  await navigate(BASE);
  await evalExpr(ENTER_FROM_TITLE);
  await sleep(300);
  await evalExpr(`
    window.game.screenManager.show('screen-dev');
    window.game.switchMode('daily');
  `);
  await sleep(900);
  await evalExpr(DISMISS_TOASTS);
  await screenshot('play-daily-mobile.png');
}

try {
  await shotTraining();
  await shotDaily();
  await shotParty();
  await shotQuest();
  await shotGameOver();
  await shotMobile();
  console.log('\n=== 모든 시나리오 완료 ===');
} catch (e) {
  console.error('FAIL:', e.message);
  console.error(e.stack);
  process.exitCode = 1;
} finally {
  ws.close();
}
