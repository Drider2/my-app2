import test from 'node:test';
import assert from 'node:assert/strict';

function formatDuration(totalSeconds) {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseVoiceNote(body) {
  const match = body.match(/^🎙️ \*\*Voice Memo\*\* \[Duration: ([\d:]+)\]\n\n([\s\S]*)$/);
  if (match) {
    return {
      isVoiceNote: true,
      duration: match[1],
      cleanContent: match[2].trim(),
    };
  }
  return {
    isVoiceNote: body.includes('🎙️') || body.includes('#voicenote'),
    duration: null,
    cleanContent: body,
  };
}

function buildVoiceNoteEntry(params, todayStr = '2026-11-09') {
  const durationLabel = formatDuration(params.durationSeconds || 0);
  const title = params.title?.trim() || `Voice Note`;
  
  const combinedTags = Array.from(new Set([
    '#voicenote',
    ...(params.tags || []).map(t => t.startsWith('#') ? t : `#${t}`)
  ]));

  const formattedBody = `🎙️ **Voice Memo** [Duration: ${durationLabel}]\n\n${params.transcription.trim()}`;

  return {
    local_date: todayStr,
    title,
    body: formattedBody,
    mood: params.mood ?? 4,
    tags: combinedTags,
  };
}

test('VoiceNoteService - Duration formatting calculates mm:ss accurately', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(5), '00:05');
  assert.equal(formatDuration(65), '01:05');
  assert.equal(formatDuration(360), '06:00');
});

test('VoiceNoteService - Creates formatted voice entry with tags and metadata', () => {
  const entry = buildVoiceNoteEntry({
    title: 'Morning Strategy',
    transcription: 'Finished 5k run in the forest. High energy and ready for work.',
    durationSeconds: 78,
    mood: 5,
    tags: ['fitness', '#morning']
  });

  assert.equal(entry.title, 'Morning Strategy');
  assert.equal(entry.mood, 5);
  assert.ok(entry.tags.includes('#voicenote'));
  assert.ok(entry.tags.includes('#fitness'));
  assert.ok(entry.tags.includes('#morning'));
  assert.ok(entry.body.includes('🎙️ **Voice Memo** [Duration: 01:18]'));
  assert.ok(entry.body.includes('Finished 5k run in the forest.'));
});

test('VoiceNoteService - Accurately parses duration and clean transcription from journal body', () => {
  const rawBody = `🎙️ **Voice Memo** [Duration: 02:45]\n\nReflecting on today's milestones. Kept focus and completed tasks early.`;
  const parsed = parseVoiceNote(rawBody);

  assert.equal(parsed.isVoiceNote, true);
  assert.equal(parsed.duration, '02:45');
  assert.equal(parsed.cleanContent, "Reflecting on today's milestones. Kept focus and completed tasks early.");
});
