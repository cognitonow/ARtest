import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio
exec(open(os.path.join(HERE,'pathfinder.py')).read().split('async def main')[0])
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path=CHROMIUM)
        errs=[]; d=await mk(b,1440,900,errs,'director')
        await d.goto(BASE+'?round=6402#director'); await d.wait_for_timeout(1200)
        if not await d.is_disabled('#dir-reset'):
            d.once('dialog', lambda dlg: asyncio.ensure_future(dlg.accept())); await d.click('#dir-reset'); await d.wait_for_timeout(600)
        await d.click('#dir-start'); await d.wait_for_timeout(700)
        s = await d.evaluate('({first: Math.round((Net.state.vent.nextAt - Net.state.markAt)/1000), active: Net.state.vent.active})')
        print('first alarm scheduled', s['first'], 'seconds after start; active now:', s['active'])
        await d.click('#dir-vent'); await d.wait_for_timeout(800)
        print('alarm:', await d.text_content('#dir-vent-status'), '| trigger button disabled:', await d.is_disabled('#dir-vent'))
        await d.wait_for_timeout(46500)
        s2 = await d.evaluate('({strikes: Net.state.strikes, active: Net.state.vent.active, next: Math.round((Net.state.vent.nextAt - (Date.now()+Net.offset))/1000)})')
        print('after 46 s with nobody venting:', s2, '|', (await d.inner_text('#dir-log')).split('\n')[0])
        print('errors:', errs)
        await b.close()
asyncio.run(main())
