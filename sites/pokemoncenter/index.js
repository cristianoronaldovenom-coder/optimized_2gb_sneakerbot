import { safeType, safeClick, retry } from '../../helpers/safe-actions.js';
import logger from '../../helpers/logger.js';
import { solveCaptcha, solveHCaptcha } from '../../helpers/captcha.js';
import { storePageInTaskCache } from '../../helpers/task-cache.js';

const BASE_URL = 'https://www.pokemoncenter.com';
const LOCALE = 'en-ca';
const CHECKOUT_URL = `${BASE_URL}/${LOCALE}/checkout`;
const CART_URL = `${BASE_URL}/${LOCALE}/cart`;

const TIMEOUT = 15000;
const POLL_INTERVAL_MS = 3000;
const MAX_MONITOR_ATTEMPTS = 100;

const runPokemonCenter = async ({ page, task }) => {
  logger.info(`[PokemonCenter] Starting task ${task.id}: ${task.url}`);

  storePageInTaskCache({ taskId: task.id, page });

  await monitorAndAtc({ page, task });
  await navigateToCheckout({ page, task });
  await fillShipping({ page, task });
  await fillPayment({ page, task });
  await placeOrder({ page, task });
};

const monitorAndAtc = async ({ page, task }) => {
  logger.info(`[PokemonCenter] Monitoring product for task ${task.id}`);

  for (let attempt = 0; attempt < MAX_MONITOR_ATTEMPTS; attempt++) {
    try {
      await retry(() => page.goto(task.url, { waitUntil: 'domcontentloaded', timeout: 30000 }));

      if (task.keywords) {
        await selectVariantByKeyword({ page, task });
      }

      if (task.size) {
        await selectSize({ page, task });
      }

      const soldOut = await page.$('.product-availability .not-available');
      const addToCartBtn = await page.$('button.add-to-cart:not([disabled])');

      if (soldOut || !addToCartBtn) {
        logger.info(`[PokemonCenter] Task ${task.id} — product not available, retrying in ${POLL_INTERVAL_MS}ms (attempt ${attempt + 1}/${MAX_MONITOR_ATTEMPTS})`);
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      await addToCart({ page, task });
      return;
    } catch (err) {
      logger.warn(`[PokemonCenter] Task ${task.id} monitor error: ${err.message}`);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  throw new Error(`[PokemonCenter] Task ${task.id} timed out waiting for product to be available`);
};

const selectVariantByKeyword = async ({ page, task }) => {
  const keywordList = task.keywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  logger.info(`[PokemonCenter] Looking for variant matching keywords [${keywordList.join(', ')}] for task ${task.id}`);

  const matched = await page.evaluate((keywords) => {
    const variantSelectors = [
      '.product-variants .variant-link',
      '.variations a',
      '.product-option-value',
      '.set-select option',
      '.variant-pill',
      '.product-detail .attribute .swatchanchor',
      '.variant-selection a',
      '.product-detail select option'
    ];

    for (const sel of variantSelectors) {
      const elements = Array.from(document.querySelectorAll(sel));
      for (const el of elements) {
        const label = (el.textContent || el.value || el.dataset.attrValue || '').toLowerCase().trim();
        const matchesAll = keywords.every((kw) => label.includes(kw));
        if (matchesAll && !el.classList.contains('unselectable') && !el.disabled) {
          if (el.tagName === 'OPTION') {
            el.closest('select').value = el.value;
            el.closest('select').dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            el.click();
          }
          return label;
        }
      }
    }
    return null;
  }, keywordList);

  if (matched) {
    logger.info(`[PokemonCenter] Variant matched: "${matched}" for task ${task.id}`);
    await sleep(800);
  } else {
    logger.warn(`[PokemonCenter] No variant matched keywords [${keywordList.join(', ')}] for task ${task.id} — proceeding without variant selection`);
  }
};

const selectSize = async ({ page, task }) => {
  logger.info(`[PokemonCenter] Selecting size "${task.size}" for task ${task.id}`);

  try {
    await page.waitForSelector('.size-attribute .size-btn, .attribute-selector .swatchanchor', {
      timeout: TIMEOUT
    });

    const sizeSelected = await page.evaluate((targetSize) => {
      const sizeButtons = document.querySelectorAll(
        '.size-attribute .size-btn, .attribute-selector .swatchanchor'
      );
      for (const btn of sizeButtons) {
        const label = btn.textContent.trim().toUpperCase();
        if (label === targetSize.toUpperCase() && !btn.classList.contains('unselectable')) {
          btn.click();
          return true;
        }
      }
      return false;
    }, task.size);

    if (!sizeSelected) {
      throw new Error(`Size "${task.size}" not available`);
    }

    await sleep(500);
    logger.info(`[PokemonCenter] Size "${task.size}" selected for task ${task.id}`);
  } catch (err) {
    throw new Error(`[PokemonCenter] Size selection failed for task ${task.id}: ${err.message}`);
  }
};

const addToCart = async ({ page, task }) => {
  logger.info(`[PokemonCenter] Adding to cart for task ${task.id}`);

  await page.waitForSelector('button.add-to-cart:not([disabled])', { timeout: TIMEOUT });
  await safeClick(page, 'button.add-to-cart');

  await page.waitForSelector('.minicart-quantity, .cart-icon-quantity, .add-to-cart-messages', {
    timeout: TIMEOUT
  });

  logger.info(`[PokemonCenter] Added to cart for task ${task.id}`);
};

const navigateToCheckout = async ({ page, task }) => {
  logger.info(`[PokemonCenter] Navigating to checkout for task ${task.id}`);

  await page.goto(CART_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  await page.waitForSelector('.checkout-btn, button[name="submit"], a.checkout-btn', {
    timeout: TIMEOUT
  });

  const checkoutClicked = await page.evaluate(() => {
    const btn =
      document.querySelector('a.checkout-btn') ||
      document.querySelector('button.checkout-btn') ||
      document.querySelector('[data-action="checkout"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (!checkoutClicked) {
    await page.goto(CHECKOUT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  await page.waitForSelector('.checkout-main', { timeout: TIMEOUT });
  logger.info(`[PokemonCenter] On checkout page for task ${task.id}`);
};

const fillShipping = async ({ page, task }) => {
  logger.info(`[PokemonCenter] Filling shipping for task ${task.id}`);

  await waitForCheckoutStage(page, 'shipping');

  const address = task.shippingAddress;
  if (!address) throw new Error('No shipping address attached to task');

  await typeSfccField(page, 'input[name="firstName"]', address.first_name);
  await typeSfccField(page, 'input[name="lastName"]', address.last_name);
  await typeSfccField(page, 'input[name="address1"]', address.address1);

  if (address.address2) {
    await typeSfccField(page, 'input[name="address2"]', address.address2);
  }

  await typeSfccField(page, 'input[name="city"]', address.city);

  await page.select('select[name="stateCode"]', address.state).catch(async () => {
    await page.evaluate((val) => {
      const sel = document.querySelector(
        'select[name="stateCode"], select[name="dwfrm_shipping_shippingAddress_addressFields_states_stateCode"]'
      );
      if (sel) sel.value = val;
    }, address.state);
  });

  await typeSfccField(page, 'input[name="postalCode"]', address.zip);
  await typeSfccField(page, 'input[name="phone"]', address.phone);

  const emailInput = await page.$('input[name="email"], input#email');
  if (emailInput) {
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(task.notification_email_address || address.email, { delay: 30 });
  }

  await selectShippingMethod({ page });

  logger.info(`[PokemonCenter] Submitting shipping for task ${task.id}`);
  await page.click('button.submit-shipping');
  await waitForCheckoutStage(page, 'payment');
};

const selectShippingMethod = async ({ page }) => {
  await page.waitForSelector('.shipping-method-list', { timeout: TIMEOUT }).catch(() => {});

  const methodSelected = await page.evaluate(() => {
    const methods = document.querySelectorAll('input[name="shippingMethodID"]');
    if (methods.length > 0) {
      methods[0].click();
      return true;
    }
    return false;
  });

  if (methodSelected) {
    logger.info('[PokemonCenter] Shipping method selected');
    await sleep(1000);
  }
};

const fillPayment = async ({ page, task }) => {
  logger.info(`[PokemonCenter] Filling payment for task ${task.id}`);

  await waitForCheckoutStage(page, 'payment');

  const card = task.paymentProfile;
  if (!card) throw new Error('No payment profile attached to task');

  const billing = task.billingAddress || task.shippingAddress;
  if (!billing) throw new Error('No billing address attached to task');

  const cardNumberInput = await page.$(
    'input[name="cardNumber"], input[id*="cardNumber"], input[name="dwfrm_billing_creditCardFields_cardNumber"]'
  );
  if (!cardNumberInput) throw new Error('Card number field not found');

  await cardNumberInput.click({ clickCount: 3 });
  await cardNumberInput.type(card.card_number.replace(/\s/g, ''), { delay: 50 });

  await page.select(
    'select[id="cardType"], select[name="cardType"]',
    detectCardType(card.card_number)
  ).catch(() => {});

  await typeSfccField(
    page,
    'input[name="cardOwner"], input[name="dwfrm_billing_creditCardFields_cardOwner"]',
    card.card_holder_name
  );

  await page.select(
    'select[name="expirationMonth"], select[name="dwfrm_billing_creditCardFields_expirationMonth"]',
    card.expiration_month
  ).catch(async () => {
    await typeSfccField(page, 'input[name="expirationMonth"]', card.expiration_month);
  });

  await page.select(
    'select[name="expirationYear"], select[name="dwfrm_billing_creditCardFields_expirationYear"]',
    card.expiration_year
  ).catch(async () => {
    await typeSfccField(page, 'input[name="expirationYear"]', card.expiration_year);
  });

  await typeSfccField(
    page,
    'input[name="securityCode"], input[name="dwfrm_billing_creditCardFields_securityCode"]',
    card.cvv
  );

  await fillBillingAddress({ page, billing });

  if (task.coupon_code) {
    await applyCoupon({ page, task });
  }

  if (task.auto_solve_captchas) {
    await handleCaptcha({ page, task });
  }

  logger.info(`[PokemonCenter] Submitting payment for task ${task.id}`);
  await page.click('button.submit-payment, button[value="submit-payment"]');
  await waitForCheckoutStage(page, 'placeOrder');
};

const fillBillingAddress = async ({ page, billing }) => {
  const sameBillingCheck = await page.$(
    'input[name="matchingShippingAddress"], input[id*="sameAsBilling"], input[id*="billingAddressSameAsShipping"]'
  );
  if (sameBillingCheck) {
    const checked = await page.evaluate((el) => el.checked, sameBillingCheck);
    if (checked) return;
  }

  await typeSfccField(page, 'input[name="billing_firstName"]', billing.first_name).catch(() => {});
  await typeSfccField(page, 'input[name="billing_lastName"]', billing.last_name).catch(() => {});
  await typeSfccField(page, 'input[name="billing_address1"]', billing.address1).catch(() => {});
  await typeSfccField(page, 'input[name="billing_city"]', billing.city).catch(() => {});
  await page.select('select[name="billing_stateCode"]', billing.state).catch(() => {});
  await typeSfccField(page, 'input[name="billing_postalCode"]', billing.zip).catch(() => {});
};

const applyCoupon = async ({ page, task }) => {
  try {
    const couponInput = await page.$('input[name="couponCode"]');
    if (!couponInput) return;
    await couponInput.click({ clickCount: 3 });
    await couponInput.type(task.coupon_code, { delay: 30 });
    await page.click('button.promo-code-btn, button.promo-code-submit').catch(() => {});
    await sleep(2000);
    logger.info(`[PokemonCenter] Coupon "${task.coupon_code}" applied for task ${task.id}`);
  } catch (err) {
    logger.warn(`[PokemonCenter] Coupon failed for task ${task.id}: ${err.message}`);
  }
};

const handleCaptcha = async ({ page, task }) => {
  try {
    const captchaInfo = await page.evaluate(() => {
      const recaptchaEl = document.querySelector('.g-recaptcha, [data-sitekey]');
      const hcaptchaEl  = document.querySelector('.h-captcha, [data-hcaptcha-sitekey]');
      const iframeRC    = document.querySelector('iframe[src*="recaptcha"]');
      const iframeHC    = document.querySelector('iframe[src*="hcaptcha"]');

      if (hcaptchaEl || iframeHC) {
        const siteKey = hcaptchaEl?.dataset?.sitekey
          || hcaptchaEl?.dataset?.hcaptchaSitekey
          || iframeHC?.src?.match(/[?&]sitekey=([^&]+)/)?.[1] || null;
        return { type: 'hcaptcha', siteKey };
      }

      if (recaptchaEl || iframeRC) {
        const siteKey = recaptchaEl?.dataset?.sitekey
          || iframeRC?.src?.match(/[?&]k=([^&]+)/)?.[1]
          || document.querySelector('textarea[name="g-recaptcha-response"]')
              ?.closest('[data-sitekey]')?.dataset?.sitekey
          || null;
        return { type: 'recaptcha', siteKey };
      }

      return null;
    });

    if (!captchaInfo) {
      logger.info(`[PokemonCenter] No captcha found on page for task ${task.id}`);
      return;
    }

    if (!captchaInfo.siteKey) {
      logger.warn(`[PokemonCenter] Captcha type "${captchaInfo.type}" detected but no sitekey found — skipping`);
      return;
    }

    logger.info(`[PokemonCenter] ${captchaInfo.type} detected (sitekey: ${captchaInfo.siteKey.slice(0, 12)}…) for task ${task.id}`);

    let token;
    if (captchaInfo.type === 'hcaptcha') {
      token = await solveHCaptcha({ siteKey: captchaInfo.siteKey, pageUrl: page.url() });
    } else {
      token = await solveCaptcha({ siteKey: captchaInfo.siteKey, pageUrl: page.url() });
    }

    await page.evaluate(({ token, type }) => {
      if (type === 'hcaptcha') {
        const responseEl =
          document.querySelector('[name="h-captcha-response"]') ||
          document.querySelector('textarea[name="h-captcha-response"]');
        if (responseEl) {
          responseEl.value = token;
          responseEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (typeof hcaptcha !== 'undefined') {
          try { hcaptcha.execute(); } catch (_) {}
        }
        const widgets = document.querySelectorAll('[data-hcaptcha-widget-id]');
        widgets.forEach(w => {
          const widgetId = w.dataset.hcaptchaWidgetId;
          try { hcaptcha.close(widgetId); } catch (_) {}
          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.name = 'h-captcha-response';
          hiddenInput.value = token;
          w.appendChild(hiddenInput);
        });
      } else {
        const responseEl =
          document.getElementById('g-recaptcha-response') ||
          document.querySelector('textarea[name="g-recaptcha-response"]');
        if (responseEl) {
          responseEl.style.display = 'block';
          responseEl.value = token;
          responseEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (typeof ___grecaptcha_cfg !== 'undefined') {
          Object.values(___grecaptcha_cfg.clients || {}).forEach((client) => {
            const traverse = (obj, depth = 0) => {
              if (depth > 6 || !obj || typeof obj !== 'object') return;
              if (typeof obj.callback === 'function') {
                try { obj.callback(token); } catch (_) {}
              }
              Object.values(obj).forEach(v => traverse(v, depth + 1));
            };
            traverse(client);
          });
        }
      }
    }, { token, type: captchaInfo.type });

    await sleep(1200);
    logger.info(`[PokemonCenter] Captcha token injected for task ${task.id}`);
  } catch (err) {
    logger.warn(`[PokemonCenter] Captcha handling failed for task ${task.id}: ${err.message}`);
  }
};

const placeOrder = async ({ page, task }) => {
  logger.info(`[PokemonCenter] Placing order for task ${task.id}`);

  await waitForCheckoutStage(page, 'placeOrder');
  await page.waitForSelector('button.place-order, button.submit-order', { timeout: TIMEOUT });

  await sleep(500);

  await page.click('button.place-order, button.submit-order');

  await page.waitForSelector(
    '#checkout-main[data-checkout-stage="submitted"], .order-confirmation, .order-thank-you-msg',
    { timeout: 30000 }
  );

  const orderNumber = await page
    .evaluate(() => {
      const el =
        document.querySelector('.order-number') ||
        document.querySelector('[data-order-id]') ||
        document.querySelector('.summary-order-number');
      return el ? el.textContent.trim() : null;
    })
    .catch(() => null);

  logger.info(
    `[PokemonCenter] Order placed successfully for task ${task.id}! Order: ${orderNumber || 'N/A'}`
  );
};

const waitForCheckoutStage = async (page, stage) => {
  await page.waitForFunction(
    (s) => {
      const el = document.querySelector('.checkout-main');
      return el && el.dataset.checkoutStage === s;
    },
    { timeout: TIMEOUT },
    stage
  );
};

const typeSfccField = async (page, selector, value) => {
  if (!value) return;
  const handle = await page.$(selector);
  if (!handle) return;
  await handle.click({ clickCount: 3 });
  await handle.type(String(value), { delay: 30 });
};

const detectCardType = (number) => {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'MasterCard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(?:011|5)/.test(n)) return 'Discover';
  return 'Visa';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default runPokemonCenter;
