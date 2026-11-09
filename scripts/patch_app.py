with open('src/App.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

import re
c = re.sub(
    r'<main\s+className="relative z-\[1\][^"]*"\s+style=\{\{[^}]*\}\}\s*>',
    '<main className="relative z-[1] flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto no-scrollbar pb-28 md:pb-8">',
    c
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('App.tsx main padding patched successfully.')
