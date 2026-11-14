const fs = require('fs');
const filePath = 'src/screens/MaintenanceScreen.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Replace actionsRight
const oldActionsRight = `        actionsRight={
          <button
            onClick={() => {
              if (activeTab === 'overview') setNewCategory('personal_care');
              else setNewCategory(activeTab as MaintenanceCategory);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold transition-all tap-feedback shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add</span>
          </button>
        }`;

const newActionsRight = `        actionsRight={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsOdometerModalOpen(true)}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-cyan-400 hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Quick Update Car Odometer"
              aria-label="Update Odometer"
            >
              <Gauge className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={handleExportServiceHistoryCsv}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Export Maintenance History (.CSV)"
              aria-label="Export Maintenance CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExportServiceHistoryMd}
              className="p-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all cursor-pointer shadow-sm"
              title="Export Audit Report (.MD)"
              aria-label="Export Maintenance MD"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (activeTab === 'overview') setNewCategory('personal_care');
                else setNewCategory(activeTab as MaintenanceCategory);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold transition-all tap-feedback shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>
        }`;

// Normalize line endings for replacement
const normalize = s => s.replace(/\r\n/g, '\n');

if (normalize(code).includes(normalize(oldActionsRight))) {
  code = normalize(code).replace(normalize(oldActionsRight), normalize(newActionsRight));
  console.log('Replaced actionsRight successfully!');
} else {
  console.error('Could not find oldActionsRight!');
}

const oldModal = normalize(`      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="maintenance"
        moduleTitle="Personal Maintenance"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />
    </div>`);

const newModal = normalize(`      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="maintenance"
        moduleTitle="Personal Maintenance"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />

      {/* Quick Odometer Synchronizer Modal */}
      <UpdateOdometerModal
        isOpen={isOdometerModalOpen}
        onClose={() => setIsOdometerModalOpen(false)}
        onSuccess={(msg) => {
          triggerToast(msg);
          onRefresh();
        }}
      />
    </div>`);

if (normalize(code).includes(oldModal)) {
  code = normalize(code).replace(oldModal, newModal);
  console.log('Replaced modal end successfully!');
} else {
  console.error('Could not find oldModal!');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Done patching MaintenanceScreen.tsx');
