const fs = require('fs');
let code = fs.readFileSync('src/screens/CalendarScreen.tsx', 'utf8');

// 1. Add import
if (!code.includes('parseSmartTaskInput')) {
  code = code.replace(
    "import { db, generateUUID, getTodayLocalDate } from '../services/storage';",
    "import { db, generateUUID, getTodayLocalDate } from '../services/storage';\nimport { parseSmartTaskInput, getPriorityStyles } from '../services/taskParserService';"
  );
}

// 2. Add Tag & Priority icons to lucide-react if not present
if (!code.includes('Tag,')) {
  code = code.replace(
    'Plus,',
    'Plus,\n  Tag,\n  Zap,'
  );
}

// 3. Add live parsing computation
const stateMarker = "const [taskDueChoice, setTaskDueChoice] = useState<'today' | 'tomorrow'>('today');";
const liveParsedSnippet = `const [taskDueChoice, setTaskDueChoice] = useState<'today' | 'tomorrow'>('today');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Real-time natural language smart task parsing
  const liveParsed = useMemo(() => {
    return parseSmartTaskInput(newTaskTitle, today);
  }, [newTaskTitle, today]);`;

code = code.replace(stateMarker, liveParsedSnippet);

// 4. Update handleCreateTask to use smart parsed results
const handleCreateMarker = "    let targetDueDate = today;\n    if (taskDueChoice === 'tomorrow') {\n      const d = new Date();\n      d.setDate(d.getDate() + 1);\n      targetDueDate = d.toISOString().split('T')[0];\n    }\n\n    db.updateState(s => {\n      const t: Task = {\n        id: generateUUID(),\n        title: newTaskTitle.trim(),\n        due_date: targetDueDate,\n        due_time: '12:00',\n        done: false,\n        created_at: Date.now(),\n        updated_at: Date.now(),\n        deleted_at: null,\n      };\n      s.tasks.unshift(t);\n    });\n\n    triggerToast(`✓ Created task \"${newTaskTitle.trim()}\"`);";

const handleCreateReplacement = `    const finalDueDate = liveParsed.hasSmartTokens && liveParsed.dueDate !== today
      ? liveParsed.dueDate
      : taskDueChoice === 'tomorrow'
      ? (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()
      : liveParsed.dueDate;

    db.updateState(s => {
      const t: Task = {
        id: generateUUID(),
        title: liveParsed.cleanTitle || newTaskTitle.trim(),
        due_date: finalDueDate,
        due_time: '12:00',
        done: false,
        priority: liveParsed.priority,
        tags: liveParsed.tags.length > 0 ? liveParsed.tags : undefined,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      };
      s.tasks.unshift(t);
    });

    triggerToast(\`✓ Created task "\${liveParsed.cleanTitle}" (\${liveParsed.priority.toUpperCase()} priority)\`);`;

code = code.replace(handleCreateMarker, handleCreateReplacement);

// 5. Add live parse preview under task input form
const formInputMarker = `<div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-cyan-500 bg-[var(--color-bg)] text-[var(--color-text-primary)] shadow-sm placeholder-[var(--color-text-muted)]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold shadow-sm tap-feedback flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>`;

const formInputReplacement = `<div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add task... (e.g. 'Audit budget tomorrow !high #finance')"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-cyan-500 bg-[var(--color-bg)] text-[var(--color-text-primary)] shadow-sm placeholder-[var(--color-text-muted)]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold shadow-sm tap-feedback flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>

              {/* Live Smart Parsing Preview Chips */}
              {newTaskTitle.trim() && liveParsed.hasSmartTokens && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] animate-fade-in">
                  <span className="text-[var(--color-text-muted)]">Detected:</span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 font-semibold border border-cyan-500/20">
                    📅 {liveParsed.dueDate === today ? 'Today' : liveParsed.dueDate}
                  </span>
                  <span className={\`px-2 py-0.5 rounded-md font-bold border \${getPriorityStyles(liveParsed.priority).badgeClass}\`}>
                    ⚡ {liveParsed.priority.toUpperCase()}
                  </span>
                  {liveParsed.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                      #{t}
                    </span>
                  ))}
                </div>
              )}`;

code = code.replace(formInputMarker, formInputReplacement);

// 6. Update task card rendering to show priority badge and tags
const taskTitleMarker = `<div className={\`text-xs font-medium \${task.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}\`}>
                        {task.title}
                      </div>`;

const taskTitleReplacement = `<div className="flex items-center gap-2 flex-wrap">
                        <span className={\`text-xs font-medium \${task.done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}\`}>
                          {task.title}
                        </span>
                        {task.priority && task.priority !== 'medium' && (
                          <span className={\`px-1.5 py-0.2 rounded text-[10px] font-bold border \${getPriorityStyles(task.priority).badgeClass}\`}>
                            {task.priority.toUpperCase()}
                          </span>
                        )}
                        {task.tags?.map(t => (
                          <span key={t} className="px-1.5 py-0.2 rounded text-[10px] bg-white/[0.05] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                            #{t}
                          </span>
                        ))}
                      </div>`;

code = code.replace(taskTitleMarker, taskTitleReplacement);

fs.writeFileSync('src/screens/CalendarScreen.tsx', code, 'utf8');
console.log('CalendarScreen.tsx updated with smart task parser!');
