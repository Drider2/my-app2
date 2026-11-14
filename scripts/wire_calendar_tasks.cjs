const fs = require('fs');
let content = fs.readFileSync('src/screens/CalendarScreen.tsx', 'utf8');

// 1. Add state for taskFilter and dueChoice
const stateCode = `  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [taskDueChoice, setTaskDueChoice] = useState<'today' | 'tomorrow'>('today');
`;

content = content.replace(
  "const [newTaskTitle, setNewTaskTitle] = useState('');",
  "const [newTaskTitle, setNewTaskTitle] = useState('');\n" + stateCode
);

// 2. Enhance handleCreateTask to support taskDueChoice
const oldCreateTask = `    db.updateState(s => {
      const t: Task = {
        id: generateUUID(),
        title: newTaskTitle.trim(),
        due_date: today,
        due_time: '12:00',`;

const newCreateTask = `    let targetDueDate = today;
    if (taskDueChoice === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      targetDueDate = d.toISOString().split('T')[0];
    }

    db.updateState(s => {
      const t: Task = {
        id: generateUUID(),
        title: newTaskTitle.trim(),
        due_date: targetDueDate,
        due_time: '12:00',`;

content = content.replace(oldCreateTask, newCreateTask);

// 3. Add handleClearCompleted function
const clearFunc = `  const handleClearCompleted = () => {
    const completed = activeTasks.filter(t => t.done);
    if (completed.length === 0) return;
    if (confirm(\`Archive \${completed.length} completed tasks?\`)) {
      db.updateState(s => {
        const now = Date.now();
        s.tasks.forEach(t => {
          if (t.done && !t.deleted_at) t.deleted_at = now;
        });
      });
      triggerToast(\`✓ Archived \${completed.length} completed tasks\`);
      onRefresh();
    }
  };
`;

content = content.replace(
  'const handleCreateTask = (e: React.FormEvent) => {',
  clearFunc + '\n  const handleCreateTask = (e: React.FormEvent) => {'
);

// 4. In activeTab === 'tasks', replace task list rendering with filters + clear completed
const oldTaskListSection = `{activeTab === 'tasks' && !isEditMode && (
        <div className="space-y-3 animate-fade-in">
          <form onSubmit={handleCreateTask} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] bg-[var(--color-card)] text-[var(--color-text-primary)] shadow-sm placeholder-[var(--color-text-muted)]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[var(--color-text-primary)] text-[var(--color-bg)] rounded-2xl text-xs font-bold shadow-sm tap-feedback flex items-center gap-1"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add</span>
            </button>
          </form>

          <div className="space-y-2">
            {activeTasks.map((task) => {`;

const newTaskListSection = `{activeTab === 'tasks' && !isEditMode && (() => {
        const pendingCount = activeTasks.filter(t => !t.done).length;
        const completedCount = activeTasks.filter(t => t.done).length;
        const overdueCount = activeTasks.filter(t => !t.done && t.due_date && t.due_date < today).length;

        const filteredTasks = activeTasks.filter(task => {
          const isOverdue = !task.done && task.due_date && task.due_date < today;
          if (taskFilter === 'pending') return !task.done;
          if (taskFilter === 'completed') return task.done;
          if (taskFilter === 'overdue') return isOverdue;
          return true;
        });

        return (
          <div className="space-y-3.5 animate-fade-in">
            {/* Task Creation Form with Due Date Pills */}
            <form onSubmit={handleCreateTask} className="card-clean p-3 space-y-2.5">
              <div className="flex gap-2">
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
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-[var(--color-text-muted)]">Due date:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTaskDueChoice('today')}
                    className={\`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors \${
                      taskDueChoice === 'today'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                    }\`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskDueChoice('tomorrow')}
                    className={\`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors \${
                      taskDueChoice === 'tomorrow'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                    }\`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            </form>

            {/* Sub-Filters and Clear Completed */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: \`All (\${activeTasks.length})\` },
                  { id: 'pending', label: \`Pending (\${pendingCount})\` },
                  { id: 'completed', label: \`Done (\${completedCount})\` },
                  ...(overdueCount > 0 ? [{ id: 'overdue', label: \`Overdue (\${overdueCount})\` }] : [])
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTaskFilter(f.id as any)}
                    className={\`px-3 py-1.5 rounded-full text-xs font-semibold transition-all \${
                      taskFilter === f.id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                    }\`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-negative)] shrink-0 transition-colors"
                >
                  Clear Done
                </button>
              )}
            </div>

            {/* Filtered Tasks List */}
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                  No tasks under this filter.
                </div>
              ) : (
                filteredTasks.map((task) => {`;

content = content.replace(oldTaskListSection, newTaskListSection);
content = content.replace(
  '            })}\n          </div>\n        </div>\n      )}',
  '            })}\n            </div>\n          </div>\n        );\n      })()}'
);
content = content.replace(
  '            })}\r\n          </div>\r\n        </div>\r\n      )}',
  '            })}\r\n            </div>\r\n          </div>\r\n        );\r\n      })()}'
);

fs.writeFileSync('src/screens/CalendarScreen.tsx', content, 'utf8');
console.log('Successfully enhanced CalendarScreen.tsx with task filters and due date pills');
