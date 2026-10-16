// Browser-only fixtures: every API request is intercepted. No payment is signed.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const wallet = '11111111111111111111111111111111';
const signature = '1'.repeat(88);
const accounts = ['task-a', 'task-b'].map((id, index) => ({ id, ownerWallet: wallet, paymentAddress: wallet, paymentAta: wallet, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', allocation: '10000000', ...(index === 0 ? { fundingSignature: signature } : {}) }));
const snapshot = account => ({
  account,
  task: { expiresAt: 1792140000000, mandate: { purpose: `Saved research ${account.id}`, serviceId: 'research-api', resourceId: 'research-brief', maxAmount: '1000' } },
  delegations: [{ id: `${account.id}:manager`, parentId: null, allocation: '10000000', available: '3000000', status: 'active', services: ['research-api', 'analysis-api'] }, { id: `${account.id}:research`, parentId: `${account.id}:manager`, allocation: '4000000', available: '4000000', status: 'active', services: ['research-api'] }, { id: `${account.id}:analysis`, parentId: `${account.id}:manager`, allocation: '3000000', available: '3000000', status: 'active', services: ['analysis-api'] }],
  payments: [], events: [], readiness: { ai: true, jev: false, merchant: true, rpc: true }, merchantPreview: null,
});

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    const runs = [];
    let failFirstRun = true;
    await context.addInitScript(({ wallet, signature }) => {
      let connected = localStorage.getItem('qa-wallet-connected') === 'yes';
      const account = { address: wallet, publicKey: new Uint8Array(32), chains: ['solana:devnet'], features: ['solana:signMessage', 'solana:signAndSendTransaction'] };
      const listeners = [];
      const mock = {
        version: '1.0.0', name: 'Pactlet QA Wallet', icon: 'data:image/svg+xml;base64,PHN2Zy8+', chains: ['solana:devnet'],
        get accounts() { return connected ? [account] : []; },
        features: {
          'standard:connect': { version: '1.0.0', connect: async () => { connected = true; localStorage.setItem('qa-wallet-connected', 'yes'); listeners.forEach(fn => fn({ accounts: [account] })); return { accounts: [account] }; } },
          'standard:disconnect': { version: '1.0.0', disconnect: async () => { connected = false; localStorage.removeItem('qa-wallet-connected'); listeners.forEach(fn => fn({ accounts: [] })); } },
          'standard:events': { version: '1.0.0', on: (_event, fn) => { listeners.push(fn); return () => { const index = listeners.indexOf(fn); if (index >= 0) listeners.splice(index, 1); }; } },
          'solana:signMessage': { version: '1.0.0', signMessage: async (...inputs) => inputs.map(input => ({ signedMessage: input.message, signature: new Uint8Array(64) })) },
          'solana:signAndSendTransaction': { version: '1.0.0', supportedTransactionVersions: ['legacy', 0], signAndSendTransaction: async () => { throw new Error('Unexpected payment in UI test'); } },
        },
      };
      const register = api => api.register(mock);
      window.addEventListener('wallet-standard:app-ready', event => register(event.detail));
      window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }));
      localStorage.setItem('pactlet:submitted-funding:task-b', signature);
    }, { wallet, signature });
    await context.route('**/api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/auth/session') return respond({ address: wallet });
      if (url.pathname === '/api/auth/nonce') return respond({ message: 'QA only: no real authentication' });
      if (url.pathname === '/api/auth/verify') return respond({ verified: true });
      if (url.pathname === '/api/tasks') return respond({ tasks: accounts, hasMore: false });
      if (url.pathname.endsWith('/funding-status')) return respond({ state: 'pending' }, 202);
      if (url.pathname.endsWith('/run')) {
        runs.push(request.postDataJSON());
        if (failFirstRun) { failFirstRun = false; return route.abort('failed'); }
        return respond({ routing: { source: 'deterministic-fallback', route: 'research', confidence: null }, executionMode: 'fixture-only', provider: null, model: null, output: 'QA retry completed' });
      }
      const account = accounts.find(item => url.pathname === `/api/tasks/${item.id}`);
      if (account) return respond(snapshot(account));
      throw new Error(`Unexpected API call: ${url.pathname}`);
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:3000/app?task=task-a');
    await page.getByRole('button', { name: 'Connect Pactlet QA Wallet', exact: true }).click();
    await page.getByRole('heading', { name: 'Saved research task-a', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Route & run' }).click();
    await page.getByText(/Retrying the same instructions/).waitFor();
    await page.getByRole('button', { name: 'Route & run' }).click();
    await page.getByText('QA retry completed', { exact: true }).waitFor();
    assert.equal(runs.length, 2);
    assert.equal(runs[0].purchaseRef, runs[1].purchaseRef, 'A network retry must reuse its purchase reference');
    await page.reload();
    await page.getByRole('heading', { name: 'Saved research task-a', exact: true }).waitFor();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export task' }).click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), 'pactlet-task-task-a.json');
    await page.getByRole('link', { name: /Task task-b/ }).click();
    await page.getByText('Confirmation pending', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await page.getByText('Confirmation pending', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Route & run' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Confirming on devnet…' }).isDisabled(), true);
    await page.goBack();
    await page.getByRole('heading', { name: 'Saved research task-a', exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('PASS: wallet session/task restore, history navigation/back, pending 202 guard, idempotent run retry, receipt export, mobile overflow, no JavaScript errors. All APIs and wallet actions were fixtures.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
