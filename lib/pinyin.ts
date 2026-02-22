/**
 * Pinyin conversion utilities for tone numbers <-> tone marks.
 * Handles the 'v' -> 'ü' conversion and normalization.
 *
 * Port of pinyin_utils.py - identical logic.
 */

// Tone mark mappings for each vowel (index 0=tone1, 1=tone2, 2=tone3, 3=tone4, 4=tone5/neutral)
const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
};

// Reverse mapping: tone mark -> [base vowel, tone number]
const TONE_MARK_TO_NUMBER: Record<string, [string, number]> = {};
for (const [vowel, marks] of Object.entries(TONE_MARKS)) {
  for (let i = 0; i < marks.length; i++) {
    TONE_MARK_TO_NUMBER[marks[i]] = [vowel, i < 4 ? i + 1 : 5];
  }
}

/**
 * Normalize user input pinyin:
 * - Convert 'v' to 'ü'
 * - Lowercase
 * - Handle both tone numbers and tone marks
 * Returns normalized pinyin for search (no tones, no marks).
 */
export function normalizePinyinInput(text: string): string {
  text = text.toLowerCase();
  text = text.replace(/v/g, 'ü');

  // Remove tone numbers
  text = text.replace(/[1-5]/g, '');

  // Remove tone marks by converting to base vowels
  for (const [mark, [vowel]] of Object.entries(TONE_MARK_TO_NUMBER)) {
    text = text.split(mark).join(vowel);
  }

  // Convert ü back to v for consistent storage/search
  text = text.replace(/ü/g, 'v');

  return text;
}

/**
 * Convert a pinyin syllable with tone number to tone marks.
 * E.g., 'ni3' -> 'nǐ', 'lv4' -> 'lǜ'
 *
 * Tone placement rules:
 * 1. If there's an 'a' or 'e', it takes the tone mark
 * 2. If there's 'ou', the 'o' takes the tone mark
 * 3. Otherwise, the second vowel takes the tone mark
 */
export function toneNumberToMark(syllable: string): string {
  syllable = syllable.toLowerCase().replace(/v/g, 'ü');

  // Extract tone number
  const match = syllable.match(/^([a-zü]+)([1-5])?$/);
  if (!match) {
    return syllable;
  }

  const base = match[1];
  const tone = match[2] ? parseInt(match[2]) : 5;

  if (tone === 5) {
    return base;
  }

  // Find the vowel to mark
  const vowels = 'aeiouü';
  const vowelPositions: [number, string][] = [];
  for (let i = 0; i < base.length; i++) {
    if (vowels.includes(base[i])) {
      vowelPositions.push([i, base[i]]);
    }
  }

  if (vowelPositions.length === 0) {
    return base;
  }

  // Determine which vowel gets the tone mark
  let markPos: number | null = null;

  // Rule 1: 'a' or 'e' takes the mark
  for (const [pos, vowel] of vowelPositions) {
    if (vowel === 'a' || vowel === 'e') {
      markPos = pos;
      break;
    }
  }

  // Rule 2: 'ou' - 'o' takes the mark
  if (markPos === null && base.includes('ou')) {
    for (const [pos, vowel] of vowelPositions) {
      if (vowel === 'o') {
        markPos = pos;
        break;
      }
    }
  }

  // Rule 3: Second vowel takes the mark
  if (markPos === null) {
    if (vowelPositions.length >= 2) {
      markPos = vowelPositions[1][0];
    } else {
      markPos = vowelPositions[0][0];
    }
  }

  // Apply the tone mark
  const vowelChar = base[markPos];
  if (vowelChar in TONE_MARKS) {
    const markedVowel = TONE_MARKS[vowelChar][tone - 1];
    return base.slice(0, markPos) + markedVowel + base.slice(markPos + 1);
  }

  return base;
}

/**
 * Convert a pinyin syllable with tone marks to tone numbers.
 * E.g., 'nǐ' -> 'ni3', 'lǜ' -> 'lv4'
 */
export function toneMarkToNumber(syllable: string): string {
  const result: string[] = [];
  let tone = 5;

  for (const char of syllable) {
    if (char in TONE_MARK_TO_NUMBER) {
      const [vowel, t] = TONE_MARK_TO_NUMBER[char];
      result.push(vowel);
      if (t < 5) {
        tone = t;
      }
    } else {
      result.push(char);
    }
  }

  const base = result.join('').replace(/ü/g, 'v');
  if (tone < 5) {
    return base + tone.toString();
  }
  return base;
}

/**
 * Convert full pinyin string with tone numbers to display format.
 * E.g., 'ni3 hao3' -> 'nǐ hǎo'
 */
export function convertPinyinDisplay(pinyinWithNumbers: string): string {
  const syllables = pinyinWithNumbers.split(/\s+/);
  return syllables.map(toneNumberToMark).join(' ');
}

/**
 * Extract individual syllables from pinyin string.
 * Returns list of [syllable_with_number, syllable_display] tuples.
 * E.g., 'ni3 hao3' -> [['ni3', 'nǐ'], ['hao3', 'hǎo']]
 */
export function extractPinyinSyllables(pinyinWithNumbers: string): [string, string][] {
  const syllables = pinyinWithNumbers.split(/\s+/);
  return syllables.map((s) => [s, toneNumberToMark(s)]);
}

/**
 * Get the audio filename for a pinyin syllable.
 * E.g., 'ni3' -> 'ni3.mp3'
 */
export function getAudioFilename(syllableWithNumber: string): string {
  // Normalize: lowercase, v for ü
  let syllable = syllableWithNumber.toLowerCase().replace(/ü/g, 'v');
  // Ensure tone number
  if (!/[1-5]$/.test(syllable)) {
    syllable += '5'; // neutral tone
  }
  return `${syllable}.mp3`;
}

// All valid pinyin syllables (without tones)
const PINYIN_SYLLABLES = new Set([
  'a','o','e','ai','ei','ao','ou','an','en','ang','eng','er',
  'ba','bo','bi','bu','bai','bei','bao','ban','ben','bang','beng','bie','biao','bian','bin','bing',
  'pa','po','pi','pu','pai','pei','pao','pou','pan','pen','pang','peng','pie','piao','pian','pin','ping',
  'ma','mo','me','mi','mu','mai','mei','mao','mou','man','men','mang','meng','mie','miao','miu','mian','min','ming',
  'fa','fo','fu','fei','fou','fan','fen','fang','feng',
  'da','de','di','du','dai','dei','dao','dou','dan','den','dang','deng','die','diao','diu','dian','ding','dong','duan','dui','dun','duo',
  'ta','te','ti','tu','tai','tao','tou','tan','tang','teng','tie','tiao','tian','ting','tong','tuan','tui','tun','tuo',
  'na','ne','ni','nu','nv','nai','nei','nao','nou','nan','nen','nang','neng','nie','niao','niu','nian','nin','niang','ning','nong','nuan','nuo','nve',
  'la','le','li','lu','lv','lai','lei','lao','lou','lan','lang','leng','lie','liao','liu','lian','lin','liang','ling','long','luan','lun','luo','lve',
  'ga','ge','gu','gai','gei','gao','gou','gan','gen','gang','geng','gong','gua','guai','guan','guang','gui','gun','guo',
  'ka','ke','ku','kai','kei','kao','kou','kan','ken','kang','keng','kong','kua','kuai','kuan','kuang','kui','kun','kuo',
  'ha','he','hu','hai','hei','hao','hou','han','hen','hang','heng','hong','hua','huai','huan','huang','hui','hun','huo',
  'ji','ju','jia','jie','jiao','jiu','jian','jin','jiang','jing','jiong','juan','jue','jun',
  'qi','qu','qia','qie','qiao','qiu','qian','qin','qiang','qing','qiong','quan','que','qun',
  'xi','xu','xia','xie','xiao','xiu','xian','xin','xiang','xing','xiong','xuan','xue','xun',
  'zha','zhe','zhi','zhu','zhai','zhao','zhou','zhan','zhen','zhang','zheng','zhong','zhua','zhuai','zhuan','zhuang','zhui','zhun','zhuo',
  'cha','che','chi','chu','chai','chao','chou','chan','chen','chang','cheng','chong','chuai','chuan','chuang','chui','chun','chuo',
  'sha','she','shi','shu','shai','shao','shou','shan','shen','shang','sheng','shua','shuai','shuan','shuang','shui','shun','shuo',
  're','ri','ru','rao','rou','ran','ren','rang','reng','rong','rua','ruan','rui','run','ruo',
  'za','ze','zi','zu','zai','zei','zao','zou','zan','zen','zang','zeng','zong','zuan','zui','zun','zuo',
  'ca','ce','ci','cu','cai','cao','cou','can','cen','cang','ceng','cong','cuan','cui','cun','cuo',
  'sa','se','si','su','sai','sao','sou','san','sen','sang','seng','song','suan','sui','sun','suo',
  'ya','yo','ye','yu','yai','yao','you','yan','yang','ying','yong','yuan','yue','yun',
  'wa','wo','wu','wai','wei','wan','wen','wang','weng',
]);

/**
 * Try to decompose a string into valid pinyin syllables using greedy longest-match.
 * Returns true only if the entire string can be consumed.
 */
function canDecomposeAsPinyin(s: string): boolean {
  let i = 0;
  while (i < s.length) {
    let matched = false;
    // Try longest syllable first (max 6 chars: zhuang)
    for (let len = Math.min(6, s.length - i); len >= 1; len--) {
      if (PINYIN_SYLLABLES.has(s.slice(i, i + len))) {
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

/**
 * Check if text looks like pinyin input.
 * Validates that text can be decomposed into real pinyin syllables,
 * not just any ASCII string. Handles tone numbers, tone marks, and spaces.
 */
export function isPinyin(text: string): boolean {
  if (!text || !text.trim()) return false;

  let t = text.toLowerCase().replace(/v/g, 'ü');
  // Remove tone numbers
  t = t.replace(/[1-5]/g, '');
  // Replace tone marks with their base vowels (ā→a, é→e, etc.)
  for (const [mark, [vowel]] of Object.entries(TONE_MARK_TO_NUMBER)) {
    // Skip plain ASCII vowels — they're already correct
    if (/^[a-z]$/.test(mark)) continue;
    t = t.split(mark).join(vowel);
  }
  // Convert ü to v for matching against syllable set
  t = t.replace(/ü/g, 'v');

  // Must be all ASCII letters and spaces
  if (!/^[a-z\s]+$/.test(t)) return false;

  // Check each space-separated chunk decomposes into valid pinyin syllables
  const chunks = t.split(/\s+/).filter(Boolean);
  return chunks.length > 0 && chunks.every(canDecomposeAsPinyin);
}

/**
 * Check if text contains Chinese characters.
 */
export function isChinese(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code >= 0x4e00 && code <= 0x9fff) return true;
    if (code >= 0x3400 && code <= 0x4dbf) return true; // Extension A
    if (code >= 0x20000 && code <= 0x2a6df) return true; // Extension B
  }
  return false;
}
