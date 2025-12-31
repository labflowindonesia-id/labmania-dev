import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000/C:\Users\admin\Desktop\AI\System Projects\labmania-rev1", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input username 'admin', select role 'admin', input password '123', and click Sign In button
        frame = context.pages[-1]
        # Input username admin
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('admin')
        

        frame = context.pages[-1]
        # Open role dropdown
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/form/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select 'Admin' role, input password '123', and click Sign In button
        frame = context.pages[-1]
        # Select role Admin
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click Sign In button to log in as admin
        frame = context.pages[-1]
        # Click Sign In button
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input password '123' into password field and click Sign In button to proceed with login.
        frame = context.pages[-1]
        # Input password 123
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/form/div[3]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123')
        

        frame = context.pages[-1]
        # Click Sign In button
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Katalog Reagen' to navigate to reagents catalog
        frame = context.pages[-1]
        # Click on 'Katalog Reagen' in sidebar menu
        elem = frame.locator('xpath=html/body/div[2]/div/div[2]/div/div[2]/div[2]/div/div[2]/div/ul/li/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Tambah Baru' button to open reagent creation form
        frame = context.pages[-1]
        # Click 'Tambah Baru' button to create new reagent
        elem = frame.locator('xpath=html/body/div[2]/main/main/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill in reagent name, CAS number, supplier, select storage location and form, set minimum stock, and upload MSDS document
        frame = context.pages[-1]
        # Input reagent name
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Test Reagent')
        

        frame = context.pages[-1]
        # Input CAS number
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123-45-6')
        

        frame = context.pages[-1]
        # Input supplier name
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Test Supplier')
        

        frame = context.pages[-1]
        # Open storage location dropdown
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select storage location 'TC 1', open form dropdown, select first form option, set minimum stock, and upload MSDS document
        frame = context.pages[-1]
        # Select storage location TC 1
        elem = frame.locator('xpath=html/body/div[5]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select reagent form from dropdown, upload MSDS document, then save the new reagent
        frame = context.pages[-1]
        # Select first option in form dropdown
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div[3]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select 'Solid' as reagent form, set minimum stock to 10, upload MSDS document, and save the reagent
        frame = context.pages[-1]
        # Select 'Solid' option for reagent form
        elem = frame.locator('xpath=html/body/div[5]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Upload MSDS document and save the new reagent
        frame = context.pages[-1]
        # Click 'Simpan' button to save the new reagent
        elem = frame.locator('xpath=html/body/div[4]/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Search for reagent by name 'Test Reagent' and filter by expiry date to verify search and filter functionality
        frame = context.pages[-1]
        # Search for reagent by name 'Test Reagent'
        elem = frame.locator('xpath=html/body/div[2]/main/main/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Test Reagent')
        

        frame = context.pages[-1]
        # Click filter dropdown for expiry date FEFO (Exp Terdekat)
        elem = frame.locator('xpath=html/body/div[2]/main/main/div/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Katalog Reagen').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Kelola daftar reagen dan bahan kimia laboratorium').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Tambah Baru').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Semua Status').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=FEFO (Exp Terdekat)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Test Reagent').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=123-45-6').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Habis').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Stok: 0').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    