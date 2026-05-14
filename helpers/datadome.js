import { URLSearchParams } from 'url';
import logger from './logger.js';

const DD_VERSION = '5.1.5';

const buildFingerprint = (ua) => ({
  log2: 'gl,tzp',
  r3n: 33,
  glvd: 'Google Inc. (Intel)',
  glrd: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  nddc: 1,
  exp8: 0,
  dp0: false,
  ucdv: false,
  wdifrm: false,
  npmtm: false,
  wdif: false,
  wdifpnh: '2935780137',
  lg: 'en-CA',
  isb: false,
  idp: true,
  crt: 0,
  vnd: 'Google Inc.',
  bid: 'NA',
  med: 'defined',
  pltod: false,
  csssp: '',
  awe: false,
  phe: false,
  dat: false,
  nm: false,
  geb: false,
  sqt: false,
  pf: 'Win32',
  hc: 8,
  br_oh: 1040,
  br_ow: 1920,
  ua,
  wbd: false,
  ts_mtp: 0,
  mob: false,
  lgs: '["en-CA","en-US","en"]',
  dvm: 8,
  hcovdr: false,
  plovdr: false,
  ftsovdr: false,
  orf: '',
  trrd: 0.4 + Math.random() * 0.6,
  br_w: 1280,
  br_h: 800,
  br_iw: 1280,
  br_ih: 800,
  ars_w: 1920,
  ars_h: 1040,
  rs_w: 1920,
  rs_h: 1080,
  rs_cd: 24,
  pr: 1,
  so: 'landscape-primary',
  vco: '',
  vcots: false,
  vch: 'probably',
  vchts: true,
  vcw: 'probably',
  vcwts: true,
  vc3: 'maybe',
  vc3ts: false,
  vcmp: '',
  vcmpts: false,
  vcq: '',
  vcqts: false,
  vc1: 'probably',
  vc1ts: true,
  cssS: '11.98,11.10,8.38,3.47,5.46,5.52,12.81,14.75,3.69',
  css0: '31, 23, 55',
  css1: '3.40436, 0.448448, -0.50016, 0.0390445, -0.633075, -1.16183, -5.35075, 0.417701, -0.85683, 5.28962, -1.08932, 0.0850367, -10.976, 67.7601, -13.9542, 2.08932',
  cssH: '0px',
  plu: 'PDF Viewer,Chrome PDF Viewer,Chromium PDF Viewer,Microsoft Edge PDF Viewer,WebKit built-in PDF',
  plgod: false,
  plg: 5,
  plgne: true,
  plgre: true,
  plgof: false,
  plggt: false,
  mmt: 'application/pdf,text/pdf',
  bchk: '3223aeb6721e0d0917e7928181193ac88dcd62fad5cadfbe7a2b2b473ecf58ee70f018dbdb1a1832e8dc6528387b0745971dbcd82384261e9a4e3f',
  nt_tcp: 50 + Math.random() * 80,
  nt_dns: 10 + Math.random() * 30,
  nt_rd: 0,
  nt_irt: -(80 + Math.random() * 50),
  nt_rt: 20 + Math.random() * 30,
  nt_tls: 30 + Math.random() * 20,
  nt_ttf: 100 + Math.random() * 80,
  nt_swt: 1 + Math.random(),
  nt_csd: 400 + Math.floor(Math.random() * 200),
  nt_nhp: 'http/1.1',
  nt_rdc: 0,
  nt_it: 'navigation',
  nt_prs: 0,
  nt_esc: 30 + Math.random() * 20,
  nt_ttrd: -0.1 + Math.random() * 0.05,
  nt_le: 0,
  nt_dcle: 0,
  nt_di: 30000 + Math.random() * 10000,
  nt_dc: 0,
  muev: false,
  pro_t: true,
  wglo: true,
  prso: true,
  wbst: true,
  psn: true,
  edp: true,
  addt: true,
  wsdc: true,
  ccsr: true,
  nuad: true,
  bcda: false,
  idn: true,
  capi: false,
  svde: false,
  vpbq: true,
  m_fmi: false,
  mq: 'aptr:fine, ahvr:hover',
  aco: 'probably',
  acots: false,
  acmp: 'probably',
  acmpts: true,
  acw: 'probably',
  acwts: false,
  acma: 'maybe',
  acmats: false,
  acaa: 'probably',
  acaats: true,
  ac3: 'maybe',
  ac3ts: false,
  acf: 'probably',
  acfts: false,
  acmp4: 'maybe',
  acmp4ts: false,
  acmp3: 'probably',
  acmp3ts: false,
  acwm: 'maybe',
  acwmts: false,
  ocpt: false,
  ckwa: true,
  spwn: false,
  emt: false,
  bfr: false,
  tz: new Date().getTimezoneOffset() * -1,
  hdn: false,
  xt1: true,
  cdhf: true,
  eva: 40,
  cokys: ',loadTimes,csi,app',
  ecpc: false,
  wwl: false,
  tzp: 'America/Toronto',
  es_sigmdn: null,
  es_mumdn: null,
  es_distmdn: null,
  es_angsmdn: null,
  es_angemdn: null,
  k_hA: null,
  k_hSD: null,
  k_pA: null,
  k_pSD: null,
  k_rA: null,
  k_rSD: null,
  k_ikA: null,
  k_ikSD: null,
  k_kdc: 0,
  k_kuc: 0,
  m_s_c: 0,
  m_m_c: Math.floor(Math.random() * 3),
  m_c_c: 0,
  m_cm_r: 0,
  m_ms_r: -1,
  uish: '3391171800',
  jset: Math.floor(Date.now() / 1000) + 3600,
  bpc: 2,
  isf: false,
  isf2: false,
  dt: true,
  fph: 470008069,
  emd: 'k:ai,vi,ao',
  bci: false,
  bcl: 0.31,
  bct: null,
  bdt: 2500 + Math.floor(Math.random() * 1000)
});

class DataDomeGenerator {
  constructor(key, cookie) {
    this.key = key;
    this.cookie = cookie;
    this.t = 9959949970;
    this.n = 1789537805;
  }

  _hashStrToInt(s) {
    if (!s) return this.n;
    let o = 0;
    for (let i = 0; i < s.length; i++) {
      o = ((o << 5) - o + s.charCodeAt(i)) | 0;
    }
    return o;
  }

  _prngH(n) {
    n ^= n << 13;
    n ^= n >>> 17;
    n ^= n << 5;
    return n | 0;
  }

  _createKeystreamGenerator(seed1, seed2) {
    let e = seed1;
    let i = -1;
    let r = seed2;
    let a = true;
    let u = null;

    const generator = (get_val = false) => {
      if (u !== null) { const t = u; u = null; return t; }
      i++;
      if (i > 2) { e = this._prngH(e); i = 0; }
      let t = (e >> (16 - 8 * i)) & 0xFF;
      if (a) { r--; t ^= (r & 0xFF); }
      if (get_val) u = t;
      return t;
    };
    a = false;
    return generator;
  }

  _customB64EncodeChar(n) {
    if (37 < n) return 59 + n;
    if (11 < n) return 53 + n;
    if (1 < n) return 46 + n;
    return 50 * n + 45;
  }

  generatePayload(data) {
    const ts = Date.now();
    const seed_from_cookie = this._hashStrToInt(this.cookie);
    const initial_seed = this.t ^ seed_from_cookie ^ this._hashStrToInt(this.key);
    const e = this._prngH(this._prngH(((ts >> 3) ^ 11027890091) * this.t));
    const keystream_gen_a = this._createKeystreamGenerator(initial_seed, e);

    const payload_bytes = [];
    let is_first = true;

    const encrypt_str = (s) => {
      const buffer = Buffer.from(s, 'utf8');
      return Array.from(buffer).map(byte => byte ^ keystream_gen_a());
    };

    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      if (!is_first) payload_bytes.push(keystream_gen_a() ^ 44);
      payload_bytes.push(...encrypt_str(JSON.stringify(key)));
      payload_bytes.push(keystream_gen_a() ^ 58);
      payload_bytes.push(...encrypt_str(JSON.stringify(data[key])));
      is_first = false;
    }

    const keystream_gen_b = this._createKeystreamGenerator(
      1809053797 ^ this._hashStrToInt(this.cookie), e
    );

    const final_bytes = payload_bytes.map(byte => byte ^ keystream_gen_b());
    final_bytes.push((keystream_gen_a(true) ^ 125) ^ keystream_gen_b());

    const result_chars = [];
    let w = 0;
    let b = e;

    while (w < final_bytes.length) {
      b = (b - 1) | 0;
      const byte1 = (b & 0xFF) ^ final_bytes[w]; w++;
      b = (b - 1) | 0;
      const byte2 = w < final_bytes.length ? (b & 0xFF) ^ final_bytes[w] : 0; w++;
      b = (b - 1) | 0;
      const byte3 = w < final_bytes.length ? (b & 0xFF) ^ final_bytes[w] : 0; w++;
      const z = (byte1 << 16) | (byte2 << 8) | byte3;
      result_chars.push(String.fromCharCode(this._customB64EncodeChar((z >> 18) & 63)));
      result_chars.push(String.fromCharCode(this._customB64EncodeChar((z >> 12) & 63)));
      result_chars.push(String.fromCharCode(this._customB64EncodeChar((z >> 6) & 63)));
      result_chars.push(String.fromCharCode(this._customB64EncodeChar(z & 63)));
    }

    const padding = final_bytes.length % 3;
    return padding > 0
      ? result_chars.slice(0, -(3 - padding)).join('')
      : result_chars.join('');
  }
}

const extractDdJsKey = (html) => {
  const m =
    html.match(/ddjskey\s*=\s*["']([A-F0-9]{20,40})["']/i) ||
    html.match(/"key"\s*:\s*"([A-F0-9]{20,40})"/i) ||
    html.match(/dd\.js\?([A-F0-9]{20,40})/i) ||
    html.match(/tags\.js\?([A-F0-9]{20,40})/i);
  return m ? m[1] : null;
};

const extractDdCookieDomain = (html) => {
  const m = html.match(/"dcok"\s*:\s*"([^"]+)"/) ||
            html.match(/data-dd-cid="([^"]+)"/);
  return m ? m[1] : null;
};

const DD_ENDPOINT_MAP = {
  default: 'https://api-js.datadome.co/js/'
};

const getDdEndpoint = (pageUrl) => {
  const host = new URL(pageUrl).hostname;
  if (host.includes('garena')) return 'https://dd.garena.com/js/';
  return DD_ENDPOINT_MAP.default;
};

export const solveDataDome = async ({ pageUrl, ddJsKey, existingCookie = '.keep', ua }) => {
  try {
    const userAgent = ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    const fingerprint = buildFingerprint(userAgent);

    const origin = new URL(pageUrl).origin;
    fingerprint.dcok = '.' + new URL(pageUrl).hostname.split('.').slice(-2).join('.');

    const generator = new DataDomeGenerator(ddJsKey, existingCookie);
    const jsplPayload = generator.generatePayload(fingerprint);

    const params = new URLSearchParams();
    params.append('jspl', jsplPayload);
    params.append('eventCounters', '[]');
    params.append('jsType', 'ch');
    params.append('cid', existingCookie);
    params.append('ddk', ddJsKey);
    params.append('Referer', pageUrl);
    params.append('request', new URL(pageUrl).pathname || '/');
    params.append('responsePage', 'origin');
    params.append('ddv', DD_VERSION);

    const endpoint = getDdEndpoint(pageUrl);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-CA,en-US;q=0.9,en;q=0.8',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': origin,
        'referer': pageUrl,
        'user-agent': userAgent,
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site'
      },
      body: params.toString()
    });

    const data = await res.json();

    if (data.cookie) {
      logger.info(`[DataDome] Cookie obtained successfully`);
      return data.cookie;
    }

    logger.warn(`[DataDome] No cookie in response: ${JSON.stringify(data).slice(0, 200)}`);
    return null;
  } catch (err) {
    logger.warn(`[DataDome] Solve failed: ${err.message}`);
    return null;
  }
};

export const detectAndSolveDataDome = async ({ html, pageUrl, ua, sessionCookies }) => {
  const isDataDomeBlock =
    /datadome/i.test(html.slice(0, 5000)) &&
    (/<title>Access Denied/i.test(html) ||
     /dd\.js/i.test(html) ||
     /tags\.js/i.test(html) ||
     /blocked by DataDome/i.test(html));

  if (!isDataDomeBlock) return null;

  logger.info(`[DataDome] Challenge detected on ${pageUrl}`);

  const ddJsKey = extractDdJsKey(html);
  if (!ddJsKey) {
    logger.warn(`[DataDome] Could not extract ddjskey from page`);
    return null;
  }

  const host = new URL(pageUrl).hostname;
  const existingCookie = sessionCookies?.get?.(host) || '.keep';

  const cookie = await solveDataDome({ pageUrl, ddJsKey, existingCookie, ua });
  return cookie;
};
