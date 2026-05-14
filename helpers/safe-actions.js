export async function safeType(page, selector, value) {
  await page.waitForSelector(selector, {
    visible: true,
    timeout: 15000,
  });

  const input = await page.$(selector);

  await input.click({ clickCount: 3 });
  await input.type(String(value || ''), {
    delay: 20,
  });
}

export async function safeClick(page, selector) {
  await page.waitForSelector(selector, {
    visible: true,
    timeout: 15000,
  });

  await page.click(selector);
}

export async function retry(fn, attempts = 3, delay = 2000) {
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}
