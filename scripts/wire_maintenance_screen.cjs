const fs = require('fs');
const filePath = 'src/screens/MaintenanceScreen.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Lucide imports
code = code.replace(
  "  Trash2\n} from 'lucide-react';",
  "  Trash2,\n  Download,\n  FileText\n} from 'lucide-react';"
);

// 2. maintenanceService imports
code = code.replace(
  "  deleteMaintenanceItem\n} from '../services/maintenanceService';",
  "  deleteMaintenanceItem,\n  updateCarOdometer,\n  exportMaintenanceHistoryCsv,\n  exportMaintenanceHistoryMd\n} from '../services/maintenanceService';"
);

// 3. components/maintenance imports
code = code.replace(
  "import { MaintenanceWidgetRenderer } from '../components/maintenance/MaintenanceWidgetRenderer';",
  "import { MaintenanceWidgetRenderer, UpdateOdometerModal } from '../components/maintenance';"
);

// 4. Modal state & export handlers
const stateAndHandlers = `  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);

  const handleExportServiceHistoryCsv = () => {
    const csv = exportMaintenanceHistoryCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', \`greendream_maintenance_\${getTodayLocalDate()}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('✓ Maintenance records exported as CSV');
  };

  const handleExportServiceHistoryMd = () => {
    const md = exportMaintenanceHistoryMd();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', \`maintenance_audit_\${getTodayLocalDate()}.md\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('✓ Vehicle & care audit report exported as Markdown');
  };
`;

code = code.replace(
  "  const [toastMessage, setToastMessage] = useState<string | null>(null);",
  `  const [toastMessage, setToastMessage] = useState<string | null>(null);\n${stateAndHandlers}`
);

// 5. Replace actionsRight
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

code = code.replace(oldActionsRight, newActionsRight);

// 6. Add UpdateOdometerModal before closing </div>
const oldModalEnd = `      <ModulePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        moduleId="maintenance"
        moduleTitle="Personal Maintenance"
        activePreset={layout.preset}
        onSelectPreset={handleApplyPreset}
      />
    </div>`;

const newModalEnd = `      <ModulePresetModal
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
    </div>`;

code = code.replace(oldModalEnd, newModalEnd);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully wired MaintenanceScreen features!');
