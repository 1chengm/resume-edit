import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function getBrowser() {
    let browser;
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
        try {
            chromium.setGraphicsMode = false;
            const executablePath = await chromium.executablePath();
            console.log('Chromium executable path:', executablePath);

            browser = await puppeteer.launch({
                args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
                defaultViewport: chromium.defaultViewport,
                executablePath,
                headless: chromium.headless,
            });
        } catch (error) {
            console.error('Failed to launch browser in production:', error);
            throw error;
        }
    } else {
        try {
            const puppeteerLocal = await import('puppeteer');
            browser = await puppeteerLocal.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } catch (error) {
            console.error('Failed to launch browser locally:', error);
            throw error;
        }
    }
    return browser;
}
