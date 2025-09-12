// Cloudflare Pages Function: POST /analyze
// No paid APIs. Heuristic scoring for fast, actionable feedback.

export const onRequest = async (context) => {
  try {
    if (context.request.method !== 'POST') {
      return json({ error: 'Use POST' }, 405);
    }
    const { text = '' } = await context.request.json().catch(() => ({}));
    const input = String(text || '').trim();
    if (!input) return json({ error: "Missing 'text'" }, 400);

    const rubric = [
      ['clarity', 'Are ideas expressed clearly and concisely?'],
      ['structure', 'Logical flow with intro/body/close?'],
      ['evidence', 'Specific details/examples supporting claims?'],
      ['style', 'Engaging tone and varied rhythm?'],
      ['mechanics', 'Grammar, spelling, punctuation correct?'],
      ['originality', 'Unique insights vs clichés?'],
      ['impact', 'Memorable takeaway/closing?'],
    ];

    const result = analyze(input, rubric);
    return json({
      total: result.total,
      out_of: result.out_of,
      percent: result.percent,
      items: result.items,
      summary: result.summary,
      suggestions: result.suggestions,
    });
  } catch (e) {
    return json({ error: 'Server error' }, 500);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function analyze(text, rubric) {
  const words = tokenish(text).length || 1;
  const sentences = Math.max(1, (text.match(/[.!?]/g) || []).length);
  const avgLen = words / sentences;
  const unique = new Set(tokenish(text).map(w => w.toLowerCase())).size;
  const ttr = unique / words; // type-token ratio

  const items = [];

  for (const [cat] of rubric) {
    if (cat === 'mechanics') {
      const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(1, text.length);
      let mechanics = 10;
      if (text.includes('  ')) mechanics -= 1; // double space
      if (text.includes('   ')) mechanics -= 1; // triple space
      if (capsRatio > 0.12) mechanics -= 2; // shouting
      items.push(row(cat, clamp(mechanics), 'Read aloud once; fix extra spaces and any SHOUTY CAPS.'));
    } else if (cat === 'clarity') {
      const score = avgLen < 28 ? 10 : avgLen < 36 ? 8 : 6;
      items.push(row(cat, score, 'Tighten long sentences; prefer concrete nouns and verbs.'));
    } else if (cat === 'structure') {
      const lower = text.toLowerCase();
      const hasIntro = /(hook|introduction|opening)/.test(lower) || firstChars(text).split('\n').length < 3;
      const hasClose = /(conclusion|finally|in summary|ultimately)/.test(lower) || /[.!?]\s*$/.test(text.trim());
      const score = Math.min(10, 8 + (hasIntro ? 1 : 0) + (hasClose ? 1 : 0));
      items.push(row(cat, score, 'Use a crisp hook and a closing line that echoes the opener.'));
    } else if (cat === 'evidence') {
      const nums = (text.match(/\d/g) || []).length;
      const examples = (text.toLowerCase().match(/(for example|for instance|such as)/g) || []).length;
      const score = 6 + Math.min(4, (nums > 0 ? 1 : 0) + examples);
      items.push(row(cat, score, 'Add 1–2 concrete examples or a metric to support key claims.'));
    } else if (cat === 'style') {
      const score = Math.min(10, 7 + (ttr > 0.45 ? 1 : 0) + (avgLen > 12 && avgLen < 30 ? 1 : 0));
      items.push(row(cat, score, 'Vary sentence rhythm; swap 2–3 common words for stronger verbs.'));
    } else if (cat === 'originality') {
      const cliches = (text.toLowerCase().match(/\b(passion|ever since|always wanted|dream come true|since i was a child)\b/g) || []).length;
      const score = Math.max(5, 9 - cliches);
      items.push(row(cat, score, 'Replace clichés with one vivid, specific moment.'));
    } else if (cat === 'impact') {
      const lenBonus = text.trim().length > 400 ? 1 : 0;
      const longBonus = text.trim().length > 800 ? 1 : 0;
      const score = Math.min(10, 7 + lenBonus + longBonus);
      items.push(row(cat, score, 'End with a memorable line that ties back to your first paragraph.'));
    }
  }

  const total = items.reduce((s, i) => s + i.score, 0);
  const outOf = 10 * items.length;
  const percent = Math.round((total / outOf) * 100);

  const suggestions = dedupe([
    'Add one metric or example to bolster credibility.',
    'Trim 2–3 long sentences into punchier lines.',
    'Mirror the opening in the conclusion for a stronger arc.',
    ttr < 0.42 ? 'Increase vocabulary variety; avoid repeating the same words.' : null,
    avgLen > 34 ? 'Break up very long sentences to improve clarity.' : null,
  ]).filter(Boolean);

  return {
    total,
    out_of: outOf,
    percent,
    items,
    summary: 'Heuristic review complete — see itemized scores and suggestions.',
    suggestions,
  };
}

function row(category, score, comment) {
  return { category, score: clamp(score), comment };
}

function clamp(n, lo = 0, hi = 10) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function tokenish(text) {
  return (text.match(/\w+/g) || []);
}

function firstChars(text, n = 120) {
  return text.slice(0, n);
}

function dedupe(arr) {
  return Array.from(new Set(arr));
}
