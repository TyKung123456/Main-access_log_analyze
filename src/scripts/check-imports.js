// scripts/check-imports.js - ตรวจสอบ Import Issues
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function findJSFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findJSFiles(fullPath));
    } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function checkImports() {
  const files = findJSFiles(srcDir);
  const issues = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // ตรวจสอบ import aiService แบบ named import
      if (line.includes('import { aiService }') || line.includes('import {aiService}')) {
        issues.push({
          file: path.relative(srcDir, file),
          line: index + 1,
          content: line.trim(),
          issue: 'Using named import for aiService (should be default import)',
          fix: line.replace(/import\s*{\s*aiService\s*}/, 'import aiService')
        });
      }
      
      // ตรวจสอบ export aiService
      if (line.includes('export { aiService }') || line.includes('export const aiService')) {
        issues.push({
          file: path.relative(srcDir, file),
          line: index + 1,
          content: line.trim(),
          issue: 'Multiple exports of aiService detected',
          fix: 'Use only one export default aiService'
        });
      }
    });
  }
  
  return issues;
}

function fixImports() {
  const files = findJSFiles(srcDir);
  let fixedCount = 0;
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // แก้ไข import { aiService } เป็น import aiService
    const originalContent = content;
    content = content.replace(
      /import\s*{\s*aiService\s*}\s*from\s*['"`]([^'"`]+)['"`]/g,
      'import aiService from \'$1\''
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      modified = true;
      fixedCount++;
      console.log(`✅ Fixed: ${path.relative(srcDir, file)}`);
    }
  }
  
  return fixedCount;
}

// รันการตรวจสอบ
console.log('🔍 Checking import issues...\n');

const issues = checkImports();

if (issues.length === 0) {
  console.log('✅ No import issues found!');
} else {
  console.log(`❌ Found ${issues.length} import issues:\n`);
  
  issues.forEach(issue => {
    console.log(`📄 File: ${issue.file}:${issue.line}`);
    console.log(`❌ Issue: ${issue.issue}`);
    console.log(`📝 Current: ${issue.content}`);
    console.log(`✅ Fix: ${issue.fix}`);
    console.log('---');
  });
  
  console.log('\n🔧 Attempting to auto-fix imports...\n');
  
  const fixedCount = fixImports();
  
  if (fixedCount > 0) {
    console.log(`✅ Fixed ${fixedCount} files`);
    console.log('Please restart your development server');
  } else {
    console.log('ℹ️  No auto-fixes available. Please fix manually.');
  }
}

module.exports = { checkImports, fixImports };