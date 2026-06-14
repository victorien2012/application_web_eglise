const fs = require('fs');
const path = require('path');

const cssDir = 'd:/PROJET WEB EGLISE/frontend/src';

function findCssFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findCssFiles(filePath, fileList);
        } else if (filePath.endsWith('.css')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const replacements = [
    { regex: /(background|background-color):\s*#ffffff;?/gi, repl: '$1: var(--bg-card);' },
    { regex: /(background|background-color):\s*#fff;?/gi, repl: '$1: var(--bg-card);' },
    { regex: /(background|background-color):\s*#f8fafc;?/gi, repl: '$1: var(--bg-alt);' },
    { regex: /color:\s*#0f172a;?/gi, repl: 'color: var(--text-main);' },
    { regex: /color:\s*#1f2937;?/gi, repl: 'color: var(--text-main);' },
    { regex: /color:\s*#475569;?/gi, repl: 'color: var(--text-muted);' },
    { regex: /color:\s*#64748b;?/gi, repl: 'color: var(--text-muted);' },
    { regex: /color:\s*#94a3b8;?/gi, repl: 'color: var(--text-muted);' },
    { regex: /border(-color)?:\s*#e2e8f0;?/gi, repl: 'border$1: var(--border-color);' },
    { regex: /border(-color)?:\s*#cbd5e1;?/gi, repl: 'border$1: var(--border-color);' }
];

const cssFiles = findCssFiles(cssDir);

for (const file of cssFiles) {
    if (file.endsWith('index.css') || file.endsWith('PastorDashboard.css')) continue;
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;
    
    for (const { regex, repl } of replacements) {
        newContent = newContent.replace(regex, repl);
    }
    
    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Updated ' + file);
    }
}
