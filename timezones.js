// Shared by content.js and popup.js: guessing a time zone from a phone number, and city search.
(() => {
  'use strict';

  // Country calling code -> main time zone. `approx` marks countries spanning several zones,
  // where the phone number alone cannot tell which one the person lives in.
  const COUNTRY = {
    1: { tz: 'America/New_York', approx: true },
    7: { tz: 'Europe/Moscow', approx: true },
    20: { tz: 'Africa/Cairo' }, 27: { tz: 'Africa/Johannesburg' }, 30: { tz: 'Europe/Athens' },
    31: { tz: 'Europe/Amsterdam' }, 32: { tz: 'Europe/Brussels' }, 33: { tz: 'Europe/Paris' },
    34: { tz: 'Europe/Madrid' }, 36: { tz: 'Europe/Budapest' }, 39: { tz: 'Europe/Rome' },
    40: { tz: 'Europe/Bucharest' }, 41: { tz: 'Europe/Zurich' }, 43: { tz: 'Europe/Vienna' },
    44: { tz: 'Europe/London' }, 45: { tz: 'Europe/Copenhagen' }, 46: { tz: 'Europe/Stockholm' },
    47: { tz: 'Europe/Oslo' }, 48: { tz: 'Europe/Warsaw' }, 49: { tz: 'Europe/Berlin' },
    51: { tz: 'America/Lima' }, 52: { tz: 'America/Mexico_City', approx: true }, 53: { tz: 'America/Havana' },
    54: { tz: 'America/Argentina/Buenos_Aires' }, 55: { tz: 'America/Sao_Paulo', approx: true },
    56: { tz: 'America/Santiago' }, 57: { tz: 'America/Bogota' }, 58: { tz: 'America/Caracas' },
    60: { tz: 'Asia/Kuala_Lumpur' }, 61: { tz: 'Australia/Sydney', approx: true },
    62: { tz: 'Asia/Jakarta', approx: true }, 63: { tz: 'Asia/Manila' }, 64: { tz: 'Pacific/Auckland' },
    65: { tz: 'Asia/Singapore' }, 66: { tz: 'Asia/Bangkok' }, 81: { tz: 'Asia/Tokyo' },
    82: { tz: 'Asia/Seoul' }, 84: { tz: 'Asia/Ho_Chi_Minh' }, 86: { tz: 'Asia/Shanghai' },
    90: { tz: 'Europe/Istanbul' }, 91: { tz: 'Asia/Kolkata' }, 92: { tz: 'Asia/Karachi' },
    93: { tz: 'Asia/Kabul' }, 94: { tz: 'Asia/Colombo' }, 95: { tz: 'Asia/Yangon' }, 98: { tz: 'Asia/Tehran' },
    212: { tz: 'Africa/Casablanca' }, 213: { tz: 'Africa/Algiers' }, 216: { tz: 'Africa/Tunis' },
    218: { tz: 'Africa/Tripoli' }, 221: { tz: 'Africa/Dakar' }, 223: { tz: 'Africa/Bamako' },
    224: { tz: 'Africa/Conakry' }, 225: { tz: 'Africa/Abidjan' }, 226: { tz: 'Africa/Ouagadougou' },
    227: { tz: 'Africa/Niamey' }, 228: { tz: 'Africa/Lome' }, 229: { tz: 'Africa/Porto-Novo' },
    230: { tz: 'Indian/Mauritius' }, 233: { tz: 'Africa/Accra' }, 234: { tz: 'Africa/Lagos' },
    237: { tz: 'Africa/Douala' }, 241: { tz: 'Africa/Libreville' }, 242: { tz: 'Africa/Brazzaville' },
    243: { tz: 'Africa/Kinshasa', approx: true }, 250: { tz: 'Africa/Kigali' }, 251: { tz: 'Africa/Addis_Ababa' },
    254: { tz: 'Africa/Nairobi' }, 255: { tz: 'Africa/Dar_es_Salaam' }, 256: { tz: 'Africa/Kampala' },
    261: { tz: 'Indian/Antananarivo' }, 262: { tz: 'Indian/Reunion' }, 269: { tz: 'Indian/Comoro' },
    351: { tz: 'Europe/Lisbon' }, 352: { tz: 'Europe/Luxembourg' }, 353: { tz: 'Europe/Dublin' },
    354: { tz: 'Atlantic/Reykjavik' }, 356: { tz: 'Europe/Malta' }, 357: { tz: 'Asia/Nicosia' },
    358: { tz: 'Europe/Helsinki' }, 359: { tz: 'Europe/Sofia' }, 370: { tz: 'Europe/Vilnius' },
    371: { tz: 'Europe/Riga' }, 372: { tz: 'Europe/Tallinn' }, 377: { tz: 'Europe/Monaco' },
    380: { tz: 'Europe/Kyiv' }, 381: { tz: 'Europe/Belgrade' }, 385: { tz: 'Europe/Zagreb' },
    386: { tz: 'Europe/Ljubljana' }, 420: { tz: 'Europe/Prague' }, 421: { tz: 'Europe/Bratislava' },
    506: { tz: 'America/Costa_Rica' }, 507: { tz: 'America/Panama' }, 509: { tz: 'America/Port-au-Prince' },
    590: { tz: 'America/Guadeloupe' }, 591: { tz: 'America/La_Paz' }, 593: { tz: 'America/Guayaquil' },
    594: { tz: 'America/Cayenne' }, 595: { tz: 'America/Asuncion' }, 596: { tz: 'America/Martinique' },
    598: { tz: 'America/Montevideo' }, 687: { tz: 'Pacific/Noumea' }, 689: { tz: 'Pacific/Tahiti' },
    852: { tz: 'Asia/Hong_Kong' }, 853: { tz: 'Asia/Macau' }, 855: { tz: 'Asia/Phnom_Penh' },
    856: { tz: 'Asia/Vientiane' }, 880: { tz: 'Asia/Dhaka' }, 886: { tz: 'Asia/Taipei' },
    960: { tz: 'Indian/Maldives' }, 961: { tz: 'Asia/Beirut' }, 962: { tz: 'Asia/Amman' },
    965: { tz: 'Asia/Kuwait' }, 966: { tz: 'Asia/Riyadh' }, 971: { tz: 'Asia/Dubai' },
    972: { tz: 'Asia/Jerusalem' }, 974: { tz: 'Asia/Qatar' }, 977: { tz: 'Asia/Kathmandu' }
  };

  // North American area codes outside US Eastern time (the +1 default).
  const NANP = {
    'America/Los_Angeles': [209, 213, 279, 310, 323, 341, 408, 415, 424, 442, 510, 530, 559, 562, 619, 626, 628, 650,
      657, 661, 669, 707, 714, 747, 760, 805, 818, 820, 831, 858, 909, 916, 925, 949, 951, 206, 253, 360, 425, 509, 503,
      541, 971, 702, 725, 775],
    'America/Vancouver': [236, 250, 604, 672, 778],
    'America/Denver': [303, 719, 720, 970, 385, 435, 801, 505, 575, 208, 986, 406, 307, 915],
    'America/Edmonton': [403, 587, 780, 825],
    'America/Phoenix': [480, 520, 602, 623, 928],
    'America/Chicago': [210, 214, 254, 281, 325, 346, 361, 409, 430, 432, 469, 512, 682, 713, 726, 737, 806, 817, 830,
      832, 903, 936, 940, 945, 956, 972, 979, 217, 224, 309, 312, 331, 447, 464, 618, 630, 708, 773, 779, 815, 847, 872,
      218, 320, 507, 612, 651, 763, 952, 314, 417, 573, 636, 660, 816, 262, 414, 534, 608, 715, 920, 225, 318, 337, 504,
      985, 405, 539, 572, 580, 918, 316, 620, 785, 913, 319, 515, 563, 641, 712, 308, 402, 531, 479, 501, 870, 228, 601,
      662, 769, 205, 251, 256, 334, 659, 938, 615, 629, 731, 901, 931],
    'America/Winnipeg': [204, 431],
    'America/Regina': [306, 639],
    'America/Anchorage': [907],
    'Pacific/Honolulu': [808],
    'America/Puerto_Rico': [787, 939],
    'America/Santo_Domingo': [809, 829, 849],
    'America/Jamaica': [876],
    'America/Port_of_Spain': [868],
    'America/Barbados': [246]
  };
  const NANP_BY_AREA = {};
  for (const [tz, codes] of Object.entries(NANP)) for (const code of codes) NANP_BY_AREA[code] = tz;

  // Brazilian DDD codes outside Brasília time.
  const BRAZIL = { 65: 'America/Cuiaba', 66: 'America/Cuiaba', 67: 'America/Campo_Grande', 68: 'America/Rio_Branco',
    69: 'America/Porto_Velho', 92: 'America/Manaus', 97: 'America/Manaus', 95: 'America/Boa_Vista' };

  /** Guess { tz, approx } from an international number (digits only, no "+"); null if unknown. */
  function guessFromPhone(digits) {
    if (!digits) return null;
    for (const len of [3, 2, 1]) {
      const entry = COUNTRY[digits.slice(0, len)];
      if (!entry) continue;
      if (len === 1 && digits[0] === '1') {
        return { tz: NANP_BY_AREA[digits.slice(1, 4)] || entry.tz, approx: false };
      }
      if (digits.startsWith('55') && BRAZIL[digits.slice(2, 4)]) return { tz: BRAZIL[digits.slice(2, 4)], approx: false };
      return { tz: entry.tz, approx: !!entry.approx };
    }
    return null;
  }

  // Places people type that are not the city in the IANA name.
  const ALIASES = {
    bali: 'Asia/Makassar', denpasar: 'Asia/Makassar', ubud: 'Asia/Makassar', lombok: 'Asia/Makassar',
    'new york': 'America/New_York', miami: 'America/New_York', boston: 'America/New_York', montreal: 'America/Toronto',
    quebec: 'America/Toronto', 'san francisco': 'America/Los_Angeles', seattle: 'America/Los_Angeles',
    'las vegas': 'America/Los_Angeles', rio: 'America/Sao_Paulo', mexico: 'America/Mexico_City', cancun: 'America/Cancun',
    reunion: 'Indian/Reunion', guadeloupe: 'America/Guadeloupe', martinique: 'America/Martinique', guyane: 'America/Cayenne',
    tahiti: 'Pacific/Tahiti', polynesie: 'Pacific/Tahiti', 'nouvelle caledonie': 'Pacific/Noumea', mayotte: 'Indian/Mayotte',
    maurice: 'Indian/Mauritius', londres: 'Europe/London', pekin: 'Asia/Shanghai', beijing: 'Asia/Shanghai',
    mumbai: 'Asia/Kolkata', delhi: 'Asia/Kolkata', bangalore: 'Asia/Kolkata', inde: 'Asia/Kolkata',
    phuket: 'Asia/Bangkok', 'chiang mai': 'Asia/Bangkok', thailande: 'Asia/Bangkok', hanoi: 'Asia/Bangkok',
    saigon: 'Asia/Ho_Chi_Minh', vietnam: 'Asia/Ho_Chi_Minh', japon: 'Asia/Tokyo', osaka: 'Asia/Tokyo', kyoto: 'Asia/Tokyo',
    coree: 'Asia/Seoul', melbourne: 'Australia/Melbourne', 'nouvelle zelande': 'Pacific/Auckland', dubai: 'Asia/Dubai',
    'abu dhabi': 'Asia/Dubai', marrakech: 'Africa/Casablanca', maroc: 'Africa/Casablanca', senegal: 'Africa/Dakar',
    madagascar: 'Indian/Antananarivo', canaries: 'Atlantic/Canary', tenerife: 'Atlantic/Canary', acores: 'Atlantic/Azores',
    islande: 'Atlantic/Reykjavik', canada: 'America/Toronto', bresil: 'America/Sao_Paulo', australie: 'Australia/Sydney',
    // English names
    india: 'Asia/Kolkata', thailand: 'Asia/Bangkok', japan: 'Asia/Tokyo', korea: 'Asia/Seoul', 'south korea': 'Asia/Seoul',
    china: 'Asia/Shanghai', 'new zealand': 'Pacific/Auckland', morocco: 'Africa/Casablanca', 'canary islands': 'Atlantic/Canary',
    azores: 'Atlantic/Azores', iceland: 'Atlantic/Reykjavik', brazil: 'America/Sao_Paulo', australia: 'Australia/Sydney',
    indonesia: 'Asia/Jakarta', philippines: 'Asia/Manila', 'french polynesia': 'Pacific/Tahiti', 'new caledonia': 'Pacific/Noumea',
    mauritius: 'Indian/Mauritius', 'french guiana': 'America/Cayenne', 'los angeles': 'America/Los_Angeles', california: 'America/Los_Angeles',
    texas: 'America/Chicago', florida: 'America/New_York', hawaii: 'Pacific/Honolulu', uk: 'Europe/London', england: 'Europe/London',
    'united kingdom': 'Europe/London', usa: 'America/New_York', 'united states': 'America/New_York', uae: 'Asia/Dubai'
  };

  const ALL_ZONES = (() => {
    try { return Intl.supportedValuesOf('timeZone'); } catch { return [...new Set(Object.values(ALIASES))]; }
  })();

  const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_-]/g, ' ').trim();

  /** "America/Argentina/Buenos_Aires" -> "Buenos Aires" */
  const cityOf = (tz) => tz.split('/').pop().replace(/_/g, ' ');

  const capitalize = (s) => s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

  /** Up to `limit` { tz, label } matches for free text ("bali", "tokyo", "Asia/Mak"). */
  function searchZones(query, limit = 8) {
    const q = normalize(query || '');
    if (!q) return [];
    const out = [];
    const seen = new Set();
    const push = (tz, label) => {
      if (seen.has(tz) || out.length >= limit) return;
      seen.add(tz);
      out.push({ tz, label });
    };
    for (const [alias, tz] of Object.entries(ALIASES)) if (alias.startsWith(q)) push(tz, `${capitalize(alias)} (${tz})`);
    for (const tz of ALL_ZONES) if (normalize(cityOf(tz)).startsWith(q)) push(tz, tz.replace(/_/g, ' '));
    for (const tz of ALL_ZONES) if (normalize(tz).includes(q)) push(tz, tz.replace(/_/g, ' '));
    return out;
  }

  /** Minutes the zone is ahead of UTC at `date`. */
  function offsetMinutes(tz, date = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).formatToParts(date).map((x) => [x.type, Number(x.value)]));
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
  }

  /** "+7h", "−5h30" relative to the browser's own zone. */
  function diffLabel(tz, date = new Date()) {
    const diff = offsetMinutes(tz, date) + date.getTimezoneOffset();
    if (diff === 0) return 'same time';
    const abs = Math.abs(diff);
    const mins = abs % 60 ? String(abs % 60).padStart(2, '0') : '';
    return `${diff > 0 ? '+' : '−'}${Math.floor(abs / 60)}h${mins}`;
  }

  globalThis.WTZ = { guessFromPhone, searchZones, cityOf, offsetMinutes, diffLabel };
})();
