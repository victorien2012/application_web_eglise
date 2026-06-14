import os
import glob
import re

css_files = glob.glob('d:/PROJET WEB EGLISE/frontend/src/**/*.css', recursive=True)

# Note: We are specifically targeting color properties to avoid replacing things randomly.
# We also have to be careful with #ffffff which could be text or background.
# Often `background: #ffffff` or `background-color: #ffffff` -> var(--bg-card)
# `background: #f8fafc` -> var(--bg-alt)
# `color: #0f172a` -> var(--text-main)
# `color: #1f2937` -> var(--text-main)
# `color: #475569` -> var(--text-muted)
# `color: #64748b` -> var(--text-muted)
# `color: #94a3b8` -> var(--text-muted)
# `border: 1px solid rgba(0, 0, 0, 0.04);` -> border: 1px solid var(--border-color)

replacements = [
    (r'(background|background-color):\s*#ffffff;?', r'\1: var(--bg-card);'),
    (r'(background|background-color):\s*#fff;?', r'\1: var(--bg-card);'),
    (r'(background|background-color):\s*#f8fafc;?', r'\1: var(--bg-alt);'),
    (r'color:\s*#0f172a;?', r'color: var(--text-main);'),
    (r'color:\s*#1f2937;?', r'color: var(--text-main);'),
    (r'color:\s*#475569;?', r'color: var(--text-muted);'),
    (r'color:\s*#64748b;?', r'color: var(--text-muted);'),
    (r'color:\s*#94a3b8;?', r'color: var(--text-muted);'),
    (r'border(-color)?:\s*#e2e8f0;?', r'border\1: var(--border-color);'),
    (r'border(-color)?:\s*#cbd5e1;?', r'border\1: var(--border-color);')
]

for file_path in css_files:
    if "index.css" in file_path:
        continue # skip index.css as it contains our variables
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, repl in replacements:
        new_content = re.sub(pattern, repl, new_content, flags=re.IGNORECASE)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {file_path}')
