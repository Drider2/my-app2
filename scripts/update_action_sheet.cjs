const fs = require('fs');
let code = fs.readFileSync('src/components/AddActionSheet.tsx', 'utf8');

// Replace outer and inner container
const oldSheetHeader = `<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60  animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg sm:max-w-xl max-h-[85vh] bg-[var(--color-card)] border border-[var(--color-border)] rounded-t-3xl shadow-2xl text-[var(--text-1)] flex flex-col overflow-hidden animate-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Drag Handle */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-t-3xl shadow-2xl-handle shrink-0" />`;

const newSheetHeader = `<div className="fixed inset-0 z-50 flex phone:items-end wide:items-center tablet:items-center justify-center p-0 wide:p-4 tablet:p-6 bg-black/60 animate-fade-in" onClick={onClose}>
      <div 
        className="w-full phone:max-w-lg wide:max-w-xl tablet:max-w-2xl max-h-[85vh] bg-[var(--color-card)] border border-[var(--color-border)] phone:rounded-t-3xl wide:rounded-2xl tablet:rounded-2xl shadow-2xl text-[var(--text-1)] flex flex-col overflow-hidden animate-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Drag Handle (Mobile Phone only) */}
        <div className="phone:block wide:hidden tablet:hidden w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto my-2 shrink-0" />`;

const normOld = oldSheetHeader.replace(/\r\n/g, '\n');
const normNew = newSheetHeader.replace(/\r\n/g, '\n');
const normCode = code.replace(/\r\n/g, '\n');

if (normCode.includes(normOld)) {
  let updated = normCode.replace(normOld, normNew);
  // Also update grid cols:
  updated = updated.replace(
    '<div className="grid grid-cols-1 gap-2">',
    '<div className="grid grid-cols-1 wide:grid-cols-2 tablet:grid-cols-2 gap-2">'
  );
  fs.writeFileSync('src/components/AddActionSheet.tsx', updated, 'utf8');
  console.log('Successfully updated AddActionSheet.tsx');
} else {
  console.error('Target not found in AddActionSheet.tsx');
}
