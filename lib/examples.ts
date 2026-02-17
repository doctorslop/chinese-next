/**
 * Example sentences and usage context for dictionary entries.
 *
 * Since CC-CEDICT doesn't include example sentences, we provide two kinds of context:
 * 1. Compound words: other dictionary entries containing the word
 * 2. Curated example sentences for common words
 */

import { getDatabase, ensureInitialized, type DictEntry } from './db';
import { isChinese } from './pinyin';

export interface ExampleUsage {
  /** The compound word or phrase */
  word: string;
  /** Pinyin display with tone marks */
  pinyin: string;
  /** English definition */
  definition: string;
}

/**
 * Find compound words/phrases that contain the given Chinese word.
 * Returns entries where the word appears as part of a longer entry.
 */
export function findCompoundWords(word: string, limit: number = 8): ExampleUsage[] {
  if (!word || !isChinese(word)) return [];

  ensureInitialized();
  const db = getDatabase();

  // Find entries that contain this word but are longer (compound words)
  // Escape LIKE metacharacters to prevent pattern manipulation
  const escapedWord = word.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const rows = db.prepare(`
    SELECT simplified, pinyin_display, definition
    FROM entries
    WHERE (simplified LIKE ? ESCAPE '\\' OR traditional LIKE ? ESCAPE '\\')
      AND simplified != ? AND traditional != ?
    ORDER BY frequency DESC, LENGTH(simplified)
    LIMIT ?
  `).all(`%${escapedWord}%`, `%${escapedWord}%`, word, word, limit) as Pick<DictEntry, 'simplified' | 'pinyin_display' | 'definition'>[];

  return rows.map(row => ({
    word: row.simplified,
    pinyin: row.pinyin_display,
    definition: row.definition,
  }));
}

/**
 * Curated example sentences for very common words.
 * Each entry maps simplified Chinese to an array of [chinese, english] sentence pairs.
 */
const EXAMPLE_SENTENCES: Record<string, [string, string][]> = {
  '你好': [
    ['你好，我叫小明。', 'Hello, my name is Xiao Ming.'],
    ['你好吗？', 'How are you?'],
  ],
  '谢谢': [
    ['谢谢你的帮助。', 'Thank you for your help.'],
    ['非常谢谢！', 'Thank you very much!'],
  ],
  '是': [
    ['他是老师。', 'He is a teacher.'],
    ['这是什么？', 'What is this?'],
  ],
  '好': [
    ['今天天气很好。', 'The weather is great today.'],
    ['好的，没问题。', 'OK, no problem.'],
  ],
  '吃': [
    ['你想吃什么？', 'What do you want to eat?'],
    ['我们一起吃饭吧。', "Let's eat together."],
  ],
  '喝': [
    ['你要喝水吗？', 'Do you want to drink water?'],
    ['我喜欢喝茶。', 'I like drinking tea.'],
  ],
  '去': [
    ['你去哪儿？', 'Where are you going?'],
    ['我们去公园吧。', "Let's go to the park."],
  ],
  '来': [
    ['请进来。', 'Please come in.'],
    ['他从北京来。', 'He comes from Beijing.'],
  ],
  '说': [
    ['请你再说一遍。', 'Please say it again.'],
    ['他会说中文。', 'He can speak Chinese.'],
  ],
  '看': [
    ['你在看什么？', 'What are you looking at?'],
    ['我们一起看电影吧。', "Let's watch a movie together."],
  ],
  '学': [
    ['我在学中文。', "I'm studying Chinese."],
    ['学习很重要。', 'Studying is very important.'],
  ],
  '做': [
    ['你在做什么？', 'What are you doing?'],
    ['我做了一个蛋糕。', 'I made a cake.'],
  ],
  '想': [
    ['我想去中国。', 'I want to go to China.'],
    ['你想吃什么？', 'What do you want to eat?'],
  ],
  '买': [
    ['我想买一本书。', 'I want to buy a book.'],
    ['这个多少钱？我要买。', 'How much is this? I want to buy it.'],
  ],
  '知道': [
    ['我不知道。', "I don't know."],
    ['你知道他在哪儿吗？', 'Do you know where he is?'],
  ],
  '喜欢': [
    ['我喜欢中国菜。', 'I like Chinese food.'],
    ['你喜欢什么颜色？', 'What color do you like?'],
  ],
  '工作': [
    ['他在银行工作。', 'He works at a bank.'],
    ['工作很忙。', 'Work is very busy.'],
  ],
  '朋友': [
    ['他是我的好朋友。', 'He is my good friend.'],
    ['我和朋友一起去。', "I'm going with my friends."],
  ],
  '中国': [
    ['我去过中国。', "I've been to China."],
    ['中国很大。', 'China is very big.'],
  ],
  '可以': [
    ['我可以进来吗？', 'May I come in?'],
    ['这里可以拍照吗？', 'Can I take photos here?'],
  ],
  '没有': [
    ['我没有钱。', "I don't have money."],
    ['他没有来。', "He didn't come."],
  ],
  '觉得': [
    ['我觉得很好。', 'I think it is great.'],
    ['你觉得怎么样？', 'What do you think?'],
  ],
  '因为': [
    ['因为下雨，我们没去。', "Because it rained, we didn't go."],
    ['因为太累了，所以早睡。', 'Because I was too tired, I went to bed early.'],
  ],
  '所以': [
    ['我很累，所以想休息。', "I'm very tired, so I want to rest."],
    ['因为下雨，所以没去。', "Because it rained, so we didn't go."],
  ],
  '大': [
    ['这个房间很大。', 'This room is very big.'],
    ['他比我大两岁。', 'He is two years older than me.'],
  ],
  '小': [
    ['这只猫很小。', 'This cat is very small.'],
    ['小心！', 'Be careful!'],
  ],
  '多': [
    ['人很多。', 'There are many people.'],
    ['多少钱？', 'How much?'],
  ],
  '少': [
    ['人很少。', 'There are few people.'],
    ['多少钱？', 'How much money?'],
  ],
  '高兴': [
    ['认识你很高兴。', 'Nice to meet you.'],
    ['她今天很高兴。', 'She is very happy today.'],
  ],
  '漂亮': [
    ['这朵花很漂亮。', 'This flower is very beautiful.'],
    ['你很漂亮。', 'You are very beautiful.'],
  ],
  '时候': [
    ['你什么时候来？', 'When are you coming?'],
    ['小时候我住在北京。', 'When I was little, I lived in Beijing.'],
  ],
  '现在': [
    ['你现在忙吗？', 'Are you busy now?'],
    ['现在几点了？', 'What time is it now?'],
  ],
  '今天': [
    ['今天星期几？', 'What day is it today?'],
    ['今天天气很好。', 'The weather is great today.'],
  ],
  '明天': [
    ['明天见。', 'See you tomorrow.'],
    ['明天你有空吗？', 'Are you free tomorrow?'],
  ],
  '昨天': [
    ['昨天我去了北京。', 'Yesterday I went to Beijing.'],
    ['昨天的考试很难。', "Yesterday's exam was very hard."],
  ],
  '电话': [
    ['你的电话号码是多少？', 'What is your phone number?'],
    ['请给我打电话。', 'Please call me.'],
  ],
  '吃饭': [
    ['你吃饭了吗？', 'Have you eaten?'],
    ['我们去吃饭吧。', "Let's go eat."],
  ],
  '学习': [
    ['我每天学习中文。', 'I study Chinese every day.'],
    ['学习使人进步。', 'Study makes one progress.'],
  ],
};

export interface ExampleSentence {
  chinese: string;
  english: string;
}

/**
 * Get curated example sentences for a word.
 */
export function getExampleSentences(word: string): ExampleSentence[] {
  const sentences = EXAMPLE_SENTENCES[word];
  if (!sentences) return [];
  return sentences.map(([chinese, english]) => ({ chinese, english }));
}
