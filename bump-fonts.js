const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const projectDir = "c:\\Users\\MonPc\\Desktop\\antgravty MM\\MacroMedica_Frontend_Project\\src";
const files = walk(projectDir);

let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Sidebar specifically
    if (file.includes('DashboardSidebar')) {
        content = content.replace(
            /<p className="px-3 text-[a-z\-]+ font-semibold uppercase tracking-\[0\.28em\] text-slate-500">/g,
            '<p className="text-xs uppercase tracking-widest text-slate-500/80 font-black px-3 mb-1">'
        );
    }

    // Temporary tokens
    content = content.replace(/\btext-3xl\b/g, '__TEXT_4XL__');
    content = content.replace(/\btext-2xl\b/g, '__TEXT_3XL__');
    content = content.replace(/\btext-xl\b/g, '__TEXT_2XL__');
    content = content.replace(/\btext-lg\b/g, '__TEXT_XL__');
    content = content.replace(/\btext-base\b/g, '__TEXT_LG__');
    content = content.replace(/\btext-sm\b/g, '__TEXT_BASE__');
    content = content.replace(/\btext-xs\b/g, '__TEXT_SM__');
    
    // Pixel overrides below 14px
    content = content.replace(/\btext-\[10px\]\b/g, '__TEXT_SM__');
    content = content.replace(/\btext-\[11px\]\b/g, '__TEXT_SM__');
    content = content.replace(/\btext-\[12px\]\b/g, '__TEXT_SM__');
    content = content.replace(/\btext-\[13px\]\b/g, '__TEXT_SM__');

    // Restore mapped classes
    content = content.replace(/__TEXT_4XL__/g, 'text-4xl');
    content = content.replace(/__TEXT_3XL__/g, 'text-3xl');
    content = content.replace(/__TEXT_2XL__/g, 'text-2xl');
    content = content.replace(/__TEXT_XL__/g, 'text-xl');
    content = content.replace(/__TEXT_LG__/g, 'text-lg');
    content = content.replace(/__TEXT_BASE__/g, 'text-base');
    content = content.replace(/__TEXT_SM__/g, 'text-sm');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
    }
});

console.log(`Updated fonts in ${changedFiles} files.`);
