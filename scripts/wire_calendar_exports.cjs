const fs = require('fs');
const filePath = 'src/screens/CalendarScreen.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const normalize = s => s.replace(/\r\n/g, '\n');

// 1. Add Download to Lucide imports
code = code.replace(
  /CheckCircle2\s*\r?\n\s*\}\s*from\s*'lucide-react';/,
  "CheckCircle2,\n  Download\n} from 'lucide-react';"
);

// 2. Export handlers
const exportHandlers = `  const handleExportTasksCsv = () => {
    const tasks = (state.tasks || []).filter(t => !t.deleted_at);
    const headers = ['Task Title', 'Due Date', 'Due Time', 'Status', 'Created At'];
    const rows = tasks.map(t => {
      const sanitize = (str: string) => \`"\${str.replace(/"/g, '""')}"\`;
      return [
        sanitize(t.title),
        t.due_date || '',
        t.due_time || '',
        t.done ? 'Completed' : 'Pending',
        new Date(t.created_at).toISOString().split('T')[0]
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', \`greendream_tasks_\${today}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('✓ Exported tasks to CSV');
  };

  const handleExportCalendarIcs = () => {
    const tasks = (state.tasks || []).filter(t => !t.deleted_at && !t.done);
    const events = (state.events || []).filter(e => !e.deleted_at);

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GreenDream//Personal Management//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    for (const t of tasks) {
      if (!t.due_date) continue;
      const cleanDate = t.due_date.replace(/-/g, '');
      const timePart = t.due_time ? t.due_time.replace(/:/g, '') + '00' : '090000';
      ics.push(
        'BEGIN:VEVENT',
        \`UID:\${t.id}@greendream.app\`,
        \`DTSTAMP:\${cleanDate}T\${timePart}Z\`,
        \`DTSTART:\${cleanDate}T\${timePart}\`,
        \`SUMMARY:\${t.title.replace(/[,;\\\\]/g, ' ')}\`,
        'STATUS:NEEDS-ACTION',
        'DESCRIPTION:Task created in GreenDream',
        'END:VEVENT'
      );
    }

    for (const ev of events) {
      if (!ev.local_date) continue;
      const cleanDate = ev.local_date.replace(/-/g, '');
      const timePart = ev.start_time ? ev.start_time.replace(/:/g, '') + '00' : '100000';
      ics.push(
        'BEGIN:VEVENT',
        \`UID:\${ev.id}@greendream.app\`,
        \`DTSTAMP:\${cleanDate}T\${timePart}Z\`,
        \`DTSTART:\${cleanDate}T\${timePart}\`,
        \`SUMMARY:\${ev.title.replace(/[,;\\\\]/g, ' ')}\`,
        \`DESCRIPTION:\${(ev.description || '').replace(/[,;\\\\]/g, ' ')}\`,
        'END:VEVENT'
      );
    }

    ics.push('END:VCALENDAR');
    const icsContent = ics.join('\\r\\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', \`greendream_schedule_\${today}.ics\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('✓ Exported schedule to iCalendar (.ICS)');
  };
`;

code = code.replace(
  "    const handleClearCompleted = () => {",
  `${exportHandlers}\n    const handleClearCompleted = () => {`
);

// 3. Add actionsRight to ModuleEditHeader
const oldHeader = normalize(`      {/* Reusable Module Edit Header */}
      <ModuleEditHeader
        title="Agenda & Tasks"
        subtitle="Virtual occurrences & floating local time"
        isEditMode={isEditMode}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveLayout={handleSaveLayout}
        onOpenAddWidget={() => setIsAddWidgetModalOpen(true)}
        onOpenPresets={() => setIsPresetModalOpen(true)}
        onResetDefault={handleResetDefault}
        onBack={onBack}
      />`);

const newHeader = normalize(`      {/* Reusable Module Edit Header */}
      <ModuleEditHeader
        title="Agenda & Tasks"
        subtitle="Virtual occurrences & floating local time"
        isEditMode={isEditMode}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveLayout={handleSaveLayout}
        onOpenAddWidget={() => setIsAddWidgetModalOpen(true)}
        onOpenPresets={() => setIsPresetModalOpen(true)}
        onResetDefault={handleResetDefault}
        onBack={onBack}
        actionsRight={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCalendarIcs}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-cyan-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Export iCalendar (.ICS) for Google/Apple Calendar"
              aria-label="Export iCalendar"
            >
              <CalendarIcon className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={handleExportTasksCsv}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Export Tasks (.CSV)"
              aria-label="Export Tasks CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        }
      />`);

if (normalize(code).includes(oldHeader)) {
  code = normalize(code).replace(oldHeader, newHeader);
  console.log('actionsRight added to CalendarScreen!');
} else {
  console.error('Could not find oldHeader in CalendarScreen!');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('CalendarScreen.tsx updated successfully');
