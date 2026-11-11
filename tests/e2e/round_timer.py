import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio
exec(open(os.path.join(HERE,'room.py')).read().split('async def main')[0])
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path=CHROMIUM)
        errs=[]; d=await page_for(b,1440,900,False,errs,'director')
        x=await page_for(b,390,844,True,errs,'xeno')
        await d.goto(BASE+'?round=5150#director'); await d.wait_for_timeout(1200)
        if not await d.is_disabled('#dir-reset'):
            d.once('dialog', lambda dlg: asyncio.ensure_future(dlg.accept())); await d.click('#dir-reset'); await d.wait_for_timeout(500)
        await x.goto(BASE+'?round=5150'); await x.wait_for_timeout(400); await x.click('a[data-role=xeno]'); await x.wait_for_timeout(1000)
        await d.evaluate("Net.send({type:'length', durationMs:5000})"); await d.wait_for_timeout(400)
        await d.click('#dir-start'); await d.wait_for_timeout(1000)
        print('running:', await d.text_content('#dir-clock'), await x.text_content('#clock'))
        await d.wait_for_timeout(5500)
        print('after time:', await d.text_content('#dir-phase'), '| phone overlay:', await x.is_visible('#lost'), await x.text_content('#lost-text'))
        print('errors:', errs)
        await b.close()
asyncio.run(main())
