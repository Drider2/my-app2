import os, re

files_to_clean = [
    'src/components/AddActionSheet.tsx',
    'src/screens/GymScreen.tsx',
    'src/screens/FlameScreen.tsx',
    'src/components/charts/StreakMilestoneBadge.tsx',
    'src/components/charts/TrendCompare.tsx',
    'src/components/gym/LastSessionCard.tsx'
]

for fp in files_to_clean:
    if not os.path.exists(fp):
        continue
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # Replace glass classes with solid card classes
    c = c.replace('glass-sheet', 'bg-[var(--color-card)] border border-[var(--color-border)] rounded-t-3xl shadow-2xl')
    c = c.replace('glass-sheet-handle', 'w-12 h-1.5 rounded-full bg-[var(--color-border)] mx-auto my-2.5')
    c = c.replace('glass-card', 'bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-sm')
    c = c.replace('glass-tile', 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl')
    c = c.replace('glass-chip', 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)]')
    c = re.sub(r'backdrop-blur-[a-z0-9]+', '', c)
    c = re.sub(r'border-white/10', 'border-[var(--color-border)]', c)
    c = re.sub(r'border-white/20', 'border-[var(--color-border)]', c)
    c = re.sub(r'bg-white/5', 'bg-[var(--color-surface)]', c)
    c = re.sub(r'bg-white/10', 'bg-[var(--color-surface)]', c)
    
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'Cleaned {fp}')

print('All targeted components un-glassed.')
