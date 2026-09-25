/**
 * Scheduling tests for Session Timer.
 * Run with:  node --test tests/
 * (Node 18+; no dependencies. The src/ modules are ES modules, so
 * package.json sets "type": "module".)
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { EventBus } from '../src/eventBus.js';
import { URLParser } from '../src/urlParser.js';
import { SegmentManager } from '../src/segmentManager.js';
import { TimerCore } from '../src/coreTimer.js';
import {
  resolveTimeNearNow, sortSegmentsChronologically, normaliseSegment, escapeHtml
} from '../src/timeUtils.js';

// ---- helpers --------------------------------------------------------------

const realNow = Date.now;
let fakeNow = null;
const at = (h, m, s = 0) => new Date(2026, 8, 25, h, m, s).getTime(); // 25 Sep 2026, local time
const setNow = ms => { fakeNow = ms; };

beforeEach(() => {
  fakeNow = null;
  Date.now = () => (fakeNow ?? realNow());
  globalThis.window = {
    location: { origin: 'https://example.test', pathname: '/timer.html', href: 'https://example.test/timer.html' },
    innerWidth: 400, innerHeight: 400, addEventListener() {}
  };
  // Silence the modules' console.log chatter during tests
  console.log = () => {};
});
afterEach(() => { Date.now = realNow; });

const managers = [];
function newManager() {
  const bus = new EventBus();
  const sm = new SegmentManager(bus);
  managers.push(sm);
  return { bus, sm };
}
afterEach(() => { while (managers.length) managers.pop().destroy(); });

// ---- #1 single-segment URL round trip --------------------------------------

test('a single segment keeps its start time through a generated URL', () => {
  const p = new URLParser(new EventBus());
  p.timerSegments = [{ time: '14:00', duration: 30, mode: 'down' }];
  const { webUrl } = p.generateUrls();
  assert.match(webUrl, /\?segments=/);

  const parsed = new URLParser(new EventBus()).parseUrlParameters(webUrl);
  assert.equal(parsed.segments[0].time, '14:00');
});

test('pasting a legacy down-mode s= URL gives the segment its start time', () => {
  const p = new URLParser(new EventBus());
  // s= down mode: 15:00 is the END time, 30 minutes long -> starts 14:30
  const segs = p.parseAny('https://example.test/timer.html?s=a,15:00,30&mode=down');
  assert.equal(segs[0].time, '14:30');
});

// ---- #2 midnight -------------------------------------------------------------

test('times resolve to the occurrence within 12 hours of now', () => {
  const now = at(22, 0);
  assert.equal(new Date(resolveTimeNearNow('00:30', now)).getDate(), 26); // tomorrow
  assert.equal(new Date(resolveTimeNearNow('23:30', now)).getDate(), 25); // tonight
  assert.equal(new Date(resolveTimeNearNow('09:00', at(18, 0))).getDate(), 25); // this morning
  assert.equal(new Date(resolveTimeNearNow('23:00', at(1, 0))).getDate(), 24); // last night
});

test('segments crossing midnight keep their order', () => {
  setNow(at(22, 0));
  const r = new URLParser(new EventBus()).parseMultipleSegments('00:00,25,down|23:30,25,down');
  assert.deepEqual(r.segments.map(s => s.time), ['23:30', '00:00']);
  assert.deepEqual(
    sortSegmentsChronologically([{ time: '00:15' }, { time: '23:45' }], at(23, 0)).map(s => s.time),
    ['23:45', '00:15']
  );
});

test('a post-midnight segment loaded in the evening is scheduled, not skipped', () => {
  setNow(at(22, 0));
  const { sm } = newManager();
  sm.loadConfig({ segments: [{ time: '00:30', duration: 30, mode: 'down' }] });
  assert.equal(sm.currentSegmentIndex, 0);
  assert.equal(sm.isActive, false);
  assert.equal(new Date(sm.segments[0].startMs).getDate(), 26);

  setNow(at(0, 30) + 24 * 3600e3); // 00:30 the next day
  sm.tick();
  assert.equal(sm.isActive, true);
});

test('a finished session earlier today is skipped', () => {
  setNow(at(18, 0));
  const { sm } = newManager();
  sm.loadConfig({ segments: [{ time: '09:00', duration: 30, mode: 'down' }] });
  assert.equal(sm.currentSegmentIndex, 1);
});

// ---- joining late (#7, fixed alongside #2) ---------------------------------------

test('joining mid-session anchors to the real start, to the second', () => {
  setNow(at(14, 40, 50));
  const bus = new EventBus();
  const timer = new TimerCore({ getContext: () => ({}) }, bus);
  const sm = new SegmentManager(bus);
  managers.push(sm);
  let active;
  bus.on('segment:active', e => { active = e; });

  sm.loadConfig({ segments: [{ time: '14:30', duration: 30, mode: 'down' }] });
  assert.equal(active.elapsedSec, 650);

  timer.startSegmentNow(false); // what the scheduled auto-start does
  assert.equal(timer.segmentStartMs, at(14, 30));
  assert.equal(timer.segmentDurationSec, 1800); // ends 15:00:00, not 15:00:50
  clearInterval(timer.completionInterval);
});

// ---- #4 validation / escaping ----------------------------------------------------

test('invalid segments from a URL are dropped', () => {
  const r = new URLParser(new EventBus()).parseMultipleSegments(
    '<img src=x onerror=alert(1)>,25,down|25:00,25,down|09:00,0,down|09:00,25,sideways|9:05,25,UP'
  );
  assert.deepEqual(r.segments, [{ time: '09:05', duration: 25, mode: 'up' }]);
});

test('normaliseSegment and escapeHtml', () => {
  assert.deepEqual(normaliseSegment('7:05', '10'), { time: '07:05', duration: 10, mode: 'down' });
  assert.equal(normaliseSegment('07:05', '481', 'down'), null);
  assert.equal(escapeHtml('<b>"x"&\''), '&lt;b&gt;&quot;x&quot;&amp;&#39;');
});

// ---- #5 completion without drawing -------------------------------------------------

test('completion fires from checkCompletion, with no drawing', () => {
  setNow(at(10, 0));
  const bus = new EventBus();
  const timer = new TimerCore({ getContext: () => ({}) }, bus);
  clearInterval(timer.completionInterval);
  let completed = 0;
  bus.on('segment:completed', () => completed++);

  timer.configure({ segmentDuration: 60 });
  timer.startSegmentNow(true);
  setNow(at(10, 0, 59));
  timer.checkCompletion();
  assert.equal(completed, 0);
  setNow(at(10, 1, 0));
  timer.checkCompletion();
  assert.equal(completed, 1);
  assert.equal(timer.isRunning, false);
});
