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

const projectDir = "c:\\Users\\MonPc\\Desktop\\antgravty MM\\MacroMedica_Frontend_Project\\src\\pages\\dashboard";
const files = walk(projectDir);

let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Remove the SectionHeader import
    content = content.replace(/[\s]*import\s+\{\s*[^}]*SectionHeader[^}]*\}\s+from\s+['"][^'"]+['"];?/g, match => {
        // If there are other imports in the exact same brace, just remove SectionHeader
        if (match.includes(',') && !match.match(/\{\s*SectionHeader\s*\}/)) {
            let replaced = match.replace(/,\s*SectionHeader/, '').replace(/SectionHeader\s*,?/, '');
            return replaced;
        }
        return '';
    });
    
    // Sometimes the import is combined like import { AppButton, ContentCard, SectionHeader, StatusBadge }
    content = content.replace(/,\s*SectionHeader\s*/g, ' ');
    content = content.replace(/SectionHeader\s*,\s*/g, ' ');

    // Remove the actual SectionHeader JSX usage. 
    // It's usually <SectionHeader ... \n />
    // We match from <SectionHeader up to />
    content = content.replace(/<SectionHeader[\s\S]*?\/>/g, '');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
    }
});

console.log(`Removed SectionHeader from ${changedFiles} files.`);
