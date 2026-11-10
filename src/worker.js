// Project Aether room server.
// Every round number is one room. Devices connect over a WebSocket at /room/<round>/ws?role=<role>&id=<device id>.
// The room keeps the timer, strikes and solved nodes, and sends the full state to every device after each change.
import { DurableObject } from 'cloudflare:workers';

const ROLES = { director: 'Flight Director', pathfinder: 'Pathfinder', xeno: 'Xenolinguist', astro: 'Astrophysicist' };
const MAIN_NODES = ['conduits', 'resonator', 'glyph', 'descent', 'echo'];
const NODE_NAMES = { conduits: 'the Conduits', resonator: 'the Resonator', glyph: 'the Glyph Lock', descent: 'the Descent', echo: 'the Echo Chamber' };
const LENGTHS = [8, 10, 12, 15].map(m => m * 60000);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/room\/(\d{4})\/(ws|state)$/);
    if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
    return env.ASSETS.fetch(request);
  }
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.s = null;
    ctx.blockConcurrencyWhile(async () => { this.s = (await ctx.storage.get('state')) || null; });
  }
  fresh(round, epoch = 0, durationMs = 10 * 60000) {
    return { round, epoch, phase: 'lobby', durationMs, remainingAtMark: durationMs, markAt: 0, rate: 1, strikes: 0, solved: [], outcome: '', log: [] };
  }
  remaining(now) {
    const s = this.s; if (s.phase !== 'live') return s.remainingAtMark;
    return Math.max(0, s.remainingAtMark - (now - s.markAt) * s.rate);
  }
  rebase(now) { this.s.remainingAtMark = this.remaining(now); this.s.markAt = now; }
  note(now, who, text) {
    const s = this.s; const t = s.phase === 'live' ? s.durationMs - this.remaining(now) : 0;
    s.log.push({ t: Math.round(t), who, text }); if (s.log.length > 80) s.log.shift();
  }
  end(now, phase, why) {
    this.rebase(now); this.s.phase = phase; this.s.outcome = why; this.note(now, 'Room', why);
    this.ctx.storage.deleteAlarm();
  }
  async armAlarm(now) {
    const s = this.s; if (s.phase !== 'live') return;
    await this.ctx.storage.setAlarm(now + Math.ceil(this.remaining(now) / s.rate) + 50);
  }
  async alarm() {
    const now = Date.now();
    if (this.s && this.s.phase === 'live' && this.remaining(now) <= 0) { this.end(now, 'lost', 'Time ran out'); await this.save(); this.broadcast(); }
    else await this.armAlarm(now);
  }
  players() {
    return this.ctx.getWebSockets().map(ws => ws.deserializeAttachment()).filter(Boolean);
  }
  view() { return { ...this.s, serverNow: Date.now(), players: this.players() }; }
  broadcast() {
    const msg = JSON.stringify({ type: 'state', state: this.view() });
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(msg); } catch (e) {} }
  }
  async save() { await this.ctx.storage.put('state', this.s); }

  async fetch(request) {
    const url = new URL(request.url);
    const round = Number(url.pathname.split('/')[2]);
    if (!this.s) { this.s = this.fresh(round); await this.save(); }
    if (url.pathname.endsWith('/state')) return Response.json(this.view(), { headers: { 'cache-control': 'no-store' } });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const role = url.searchParams.get('role');
    if (!ROLES[role]) return new Response('Unknown role', { status: 400 });
    const id = (url.searchParams.get('id') || crypto.randomUUID()).slice(0, 40);
    for (const old of this.ctx.getWebSockets()) {
      const a = old.deserializeAttachment(); if (a && a.id === id) { try { old.close(4000, 'Replaced by a newer connection'); } catch (e) {} }
    }
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id, role, name: ROLES[role], since: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    const who = ws.deserializeAttachment() || {}; const s = this.s; const now = Date.now();
    if (s.phase === 'live' && this.remaining(now) <= 0) this.end(now, 'lost', 'Time ran out');
    const director = who.role === 'director';
    switch (msg.type) {
      case 'hello': this.note(now, who.name, 'Joined'); break;
      case 'length':
        if (director && s.phase === 'lobby' && LENGTHS.includes(msg.durationMs)) { s.durationMs = s.remainingAtMark = msg.durationMs; }
        break;
      case 'start':
        if (director && s.phase === 'lobby') { s.phase = 'live'; s.markAt = now; s.remainingAtMark = s.durationMs; s.rate = 1; this.note(now, who.name, 'Round started'); await this.armAlarm(now); }
        break;
      case 'reset':
        if (director) { const keep = s.durationMs; this.s = this.fresh(s.round, s.epoch + 1, keep); this.note(now, who.name, 'Round reset'); await this.ctx.storage.deleteAlarm(); }
        break;
      case 'strike':
        if (s.phase === 'live') {
          this.rebase(now); s.strikes += 1; s.rate = 1 + 0.15 * Math.min(2, s.strikes);
          this.note(now, who.name, 'Strike: ' + String(msg.reason || '').slice(0, 140));
          if (s.strikes >= 3) this.end(now, 'lost', 'Three strikes'); else await this.armAlarm(now);
        }
        break;
      case 'solved':
        if (s.phase === 'live' && MAIN_NODES.includes(msg.node) && !s.solved.includes(msg.node)) {
          s.solved.push(msg.node); this.note(now, who.name, `Opened ${NODE_NAMES[msg.node]}`);
          if (MAIN_NODES.every(n => s.solved.includes(n))) this.end(now, 'won', 'Core breached');
        }
        break;
      case 'ping': try { ws.send(JSON.stringify({ type: 'pong', serverNow: now, t: msg.t })); } catch (e) {} return;
      default: return;
    }
    await this.save(); this.broadcast();
  }
  async webSocketClose(ws, code, reason) { try { ws.close(code, reason); } catch (e) {} this.broadcast(); }
  async webSocketError(ws) { this.broadcast(); }
}
