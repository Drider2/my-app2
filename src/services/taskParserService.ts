export interface ParsedTaskResult {
  cleanTitle: string;
  dueDate: string; // 'YYYY-MM-DD'
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  hasSmartTokens: boolean;
}

export function parseSmartTaskInput(input: string, baseDate: string): ParsedTaskResult {
  let title = input;
  let dueDate = baseDate;
  let priority: 'low' | 'medium' | 'high' = 'medium';
  const tags: string[] = [];
  let hasSmartTokens = false;

  const todayObj = new Date(baseDate + 'T12:00:00');

  // 1. Detect Priority tokens (!urgent, !high, !p1, !low, !p3, !medium, !p2)
  if (/\b(!urgent|!high|!p1)\b/i.test(title)) {
    priority = 'high';
    title = title.replace(/\b(!urgent|!high|!p1)\b/gi, '');
    hasSmartTokens = true;
  } else if (/\b(!low|!p3)\b/i.test(title)) {
    priority = 'low';
    title = title.replace(/\b(!low|!p3)\b/gi, '');
    hasSmartTokens = true;
  } else if (/\b(!medium|!p2)\b/i.test(title)) {
    priority = 'medium';
    title = title.replace(/\b(!medium|!p2)\b/gi, '');
    hasSmartTokens = true;
  }

  // 2. Detect Due Date tokens
  if (/\b(tomorrow)\b/i.test(title)) {
    const tmrw = new Date(todayObj);
    tmrw.setDate(tmrw.getDate() + 1);
    dueDate = tmrw.toISOString().slice(0, 10);
    title = title.replace(/\b(tomorrow)\b/gi, '');
    hasSmartTokens = true;
  } else if (/\b(today)\b/i.test(title)) {
    dueDate = baseDate;
    title = title.replace(/\b(today)\b/gi, '');
    hasSmartTokens = true;
  } else if (/\b(in\s+(\d+)\s+days?)\b/i.test(title)) {
    const match = title.match(/\bin\s+(\d+)\s+days?\b/i);
    if (match) {
      const numDays = parseInt(match[1], 10);
      const target = new Date(todayObj);
      target.setDate(target.getDate() + numDays);
      dueDate = target.toISOString().slice(0, 10);
      title = title.replace(/\bin\s+\d+\s+days?\b/gi, '');
      hasSmartTokens = true;
    }
  }

  // 3. Detect Hashtags (#work, #gym, #finance, etc.)
  const hashMatches = title.match(/#([a-zA-Z0-9_-]+)/g);
  if (hashMatches) {
    hashMatches.forEach(h => {
      const tag = h.slice(1).toLowerCase();
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });
    title = title.replace(/#([a-zA-Z0-9_-]+)/g, '');
    hasSmartTokens = true;
  }

  const cleanTitle = title.replace(/\s+/g, ' ').trim();

  return {
    cleanTitle: cleanTitle || input.trim(),
    dueDate,
    priority,
    tags,
    hasSmartTokens,
  };
}

export function getPriorityStyles(priority?: 'low' | 'medium' | 'high') {
  switch (priority) {
    case 'high':
      return {
        badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-500',
        label: 'High',
      };
    case 'low':
      return {
        badgeClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        dotClass: 'bg-slate-500',
        label: 'Low',
      };
    case 'medium':
    default:
      return {
        badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400',
        label: 'Normal',
      };
  }
}
