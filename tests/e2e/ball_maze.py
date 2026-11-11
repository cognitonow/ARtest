import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio, json
exec(open(os.path.join(HERE,'phone_holo.py')).read().split('async def main')[0])
STEER = '''(which) => new Promise(res => {
  const M = AR.model, d = state.round.descent; const route = which === 'safe' ? d.route : d.obvious;
  const midR = [0.83, 0.59, 0.365]; const pt = ([r, s]) => r === 3 ? [0, 0] : [midR[r] * Math.sin(s * Math.PI / 6), -midR[r] * Math.cos(s * Math.PI / 6)];
  const wps = route.map(pt); let i = 1; const t0 = performance.now(); const s0 = state.strikes; let falls = 0, lastMode = 'roll';
  function step() {
    const ph = M.phys;
    if (ph.mode === 'fall' && lastMode !== 'fall') falls++; lastMode = ph.mode;
    if (ph.mode === 'won') { gravityIn.drag = null; return res({ won: true, secs: ((performance.now() - t0) / 1000).toFixed(1), strikes: state.strikes - s0, falls }); }
    if (which === 'obvious' && falls) { gravityIn.drag = null; return res({ won: false, fellIntoTrap: true, strikes: state.strikes - s0 }); }
    if (performance.now() - t0 > 90000) { gravityIn.drag = null; return res({ won: false, stuckAt: ph.p.map(v => v.toFixed(2)), waypoint: i, of: wps.length }); }
    if (ph.mode === 'fall') { i = 1; return requestAnimationFrame(step); }
    const [tx, tz] = wps[i]; const dx = tx - ph.p[0], dz = tz - ph.p[1], dd = Math.hypot(dx, dz) || 1e-6;
    if (dd < 0.045 && i < wps.length - 1) i++;
    const sp = Math.min(0.5, dd * 3); let ax = (dx / dd * sp - ph.v[0]) * 2, az = (dz / dd * sp - ph.v[1]) * 2; const m = Math.hypot(ax, az); if (m > 1) { ax /= m; az /= m; }
    gravityIn.drag = [ax, az]; requestAnimationFrame(step);
  }
  step();
})'''
async def open_descent(page, code):
    await page.goto('http://localhost:8771/index.html'); await page.wait_for_timeout(300)
    await page.fill('#round-input', code); await page.click('a[data-role=xeno]'); await page.wait_for_timeout(200)
    n = await page.evaluate('state.round.nodeShard.descent')
    await page.click('#start-cam .manual-open'); await page.click(f'#shard-pick [data-n="{n}"]'); await page.wait_for_timeout(1200)
async def main():
    srv=subprocess.Popen(['python3','-m','http.server','8771','-d',OUT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROMIUM,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        page=await ctx.new_page(); errs=[]
        page.on('pageerror',lambda e:errs.append(str(e))); page.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        await page.route('**/*',route)
        await open_descent(page, '4821')
        print('model', await page.evaluate('AR.modelId'), 'locked', await page.evaluate('AR.model.locked'), 'status', await page.text_content('#status'))
        await page.screenshot(path='b_start.png')
        # a real finger drag should push the ball
        p0 = await page.evaluate('AR.model.phys.p.slice()')
        await page.mouse.move(195,420); await page.mouse.down(); await page.mouse.move(275,420,steps=6); await page.wait_for_timeout(700); await page.mouse.up(); await page.wait_for_timeout(200)
        p1 = await page.evaluate('AR.model.phys.p.slice()')
        print('finger drag moved ball by', round(((p1[0]-p0[0])**2+(p1[1]-p0[1])**2)**0.5,3), 'units; drag cleared:', await page.evaluate('gravityIn.drag === null'))
        r = await page.evaluate(STEER, 'safe'); print('safe route:', r)
        await page.screenshot(path='b_won.png')
        print('descent solved:', await page.evaluate("state.solved.has('descent')"))
        results=[]
        for code in ['1234','5555','9001','2468','7777']:
            await open_descent(page, code)
            results.append((code, await page.evaluate(STEER,'safe')))
        print('more rounds (safe):', results)
        await open_descent(page, '3141')
        r = await page.evaluate(STEER, 'obvious'); print('obvious route (should hit trap):', r)
        await page.wait_for_timeout(300); await page.screenshot(path='b_trap.png')
        print('errors:', errs)
        await b.close()
    srv.terminate()
asyncio.run(main())
