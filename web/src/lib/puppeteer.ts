import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function getBrowser() {
    let browser;
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
        chromium.setGraphicsMode = false;
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(
                "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
            ),
            headless: chromium.headless,
        });
    } else {
        const puppeteerLocal = await import('puppeteer');
        browser = await puppeteerLocal.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}
