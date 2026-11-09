with open('src/screens/DashboardScreen.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find start index (Line 648 -> index 647)
start_idx = -1
for i, l in enumerate(lines):
    if '{/* When in Edit Mode, render the modular widget grid */}' in l:
        start_idx = i
        break

# Find end index (Line 1300 -> right before line 1301 SUB-MODAL: CUSTOM EXPENSE)
end_idx = -1
for i in range(start_idx, len(lines)):
    if '{/* SUB-MODAL: CUSTOM EXPENSE' in lines[i]:
        end_idx = i
        break

print(f'Replacing lines {start_idx + 1} to {end_idx}')

replacement = '''      {/* ======================================================== */}
      {/* RESPONSIVE MULTI-COLUMN DASHBOARD GRID                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 items-start">
        {activeWidgets.map((widgetConfig, idx) => (
          <div
            key={widgetConfig.id}
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
            className={`${getWidgetGridSpan(widgetConfig.size)} transition-all duration-200 ${
              isEditMode && dragOverIndex === idx ? 'ring-2 ring-[var(--color-accent)] rounded-3xl' : ''
            }`}
          >
            <DashboardWidgetRenderer
              widget={widgetConfig}
              isEditMode={isEditMode}
              onNavigate={onNavigate}
              onRefresh={onRefresh}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
              onRemove={() => handleRemoveWidget(widgetConfig.id)}
              onToggleVisibility={() => handleToggleVisibility(widgetConfig.id)}
              onChangeSize={(size) => handleChangeSize(widgetConfig.id, size)}
              isFirst={idx === 0}
              isLast={idx === activeWidgets.length - 1}
              state={state}
              cashSummary={cashSummary}
              monthSpending={monthSpending}
              todaySpending={todaySpending}
              shortcuts={shortcuts}
              upcomingReminders={upcomingReminders}
              shoppingItems={shoppingItems}
              savingsAccount={FinanceService.getSavingsAccount()}
              primaryGoal={FinanceService.getGoals()[0] || null}
              loansSummary={LoanService.getSummary()}
              borrowerProfiles={LoanService.getBorrowerProfiles().slice(0, 2)}
              forecast={ForecastService.getMonthlyForecast('current')}
              lastWeekReview={WeeklyReviewService.getWeeklyMetrics(1)}
              activeProgram={GymProgramService.getActiveProgram()}
              nextWorkout={nextWorkout}
              activeNotices={state.assistantNotices.filter(n => n.status === 'new' && !n.deleted_at)}
              todayTasks={todayTasks}
              upcomingTasks={[]}
              todayEvents={todayEvents}
              prayersForToday={prayerData.records}
              weightTrend={realWeightTrend}
              onTogglePrayer={handleTogglePrayer}
              onToggleTask={handleToggleTask}
              onTapShortcut={handleTapShortcut}
              onQuickCompleteReminder={() => {}}
              onOpenCustomExpense={() => setIsCustomExpenseModalOpen(true)}
            />
          </div>
        ))}
      </div>

'''

# Also ensure upcomingReminders and shoppingItems and getWidgetGridSpan are defined before return
helper_code = '''  const allMaintenance = state.maintenanceItems || [];
  const upcomingReminders = allMaintenance.filter(m => m.type !== 'shopping' && !m.deleted_at && getItemDueStatus(m, today) !== 'ok');
  const shoppingItems = allMaintenance.filter(m => m.type === 'shopping' && !m.deleted_at && !m.last_completed_date);

  const getWidgetGridSpan = (size: WidgetSize) => {
    switch (size) {
      case 'small': return 'col-span-1 max-w-[420px] w-full justify-self-center sm:justify-self-start';
      case 'portrait': return 'col-span-1 row-span-2 min-h-[480px] max-w-[420px] w-full justify-self-center sm:justify-self-start';
      case 'medium': return 'col-span-1 sm:col-span-1 lg:col-span-2 w-full';
      case 'large': return 'col-span-1 sm:col-span-2 lg:col-span-2 w-full';
      case 'full': return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 w-full';
      default: return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 w-full';
    }
  };

  return ('''

new_lines = lines[:start_idx] + [replacement] + lines[end_idx:]
full_content = ''.join(new_lines)
full_content = full_content.replace('  return (', helper_code, 1)

with open('src/screens/DashboardScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(full_content)

print('DashboardScreen.tsx refactored with responsive grid.')
