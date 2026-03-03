#!/usr/bin/env bun
/**
 * Automatically fix code blocks missing language tags in MDX files.
 */

const fs = require('fs');
const path = require('path');

function determineLanguage(content, prevLines, nextLines) {
    const contentLower = content.toLowerCase();
    const prevText = prevLines.slice(-5).join('\n').toLowerCase();
    const nextText = nextLines.slice(0, 3).join('\n').toLowerCase();
    
    // HTTP endpoints
    if (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\//m.test(content)) {
        return 'http';
    }
    
    // curl commands
    if (/^\s*curl\s/m.test(content)) {
        return 'bash';
    }
    
    // YAML/Docker Compose
    if (/^(services:|version:|networks:|volumes:|image:|ports:|environment:)/m.test(content)) {
        return 'yaml';
    }
    
    // Caddyfile
    if (/^\w+\.(com|dev|local|net)\s*{/m.test(content) || prevText.includes('caddy')) {
        return 'caddy';
    }
    
    // JSON
    if ((content.trim().startsWith('{') || content.trim().startsWith('[')) && /["']:\s*["'{[]/m.test(content)) {
        return 'json';
    }
    
    // XML
    if (/<\?xml|<roblox|<Item|<Properties|<\/\w+>/m.test(content)) {
        return 'xml';
    }
    
    // Lua
    if (/(function|local|if\s+.+\s+then|end\b|return\b)/m.test(content)) {
        return 'lua';
    }
    
    // Dockerfile
    if (/^(FROM|RUN|COPY|WORKDIR|ENTRYPOINT|CMD|EXPOSE|ENV|ARG)\s/m.test(content)) {
        return 'dockerfile';
    }
    
    // SQL
    if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|DROP|ALTER)\b/im.test(content)) {
        return 'sql';
    }
    
    // Go
    if (/\bfunc\s+\w+\(|\btype\s+\w+\s+(struct|interface)|package\s+\w+/.test(content)) {
        return 'go';
    }
    
    // TypeScript/JavaScript
    if (/\b(import|export|const|let|var|function|class|interface|type)\s/.test(content)) {
        return 'typescript';
    }
    
    // INI format
    if (/^\[.*\]$/m.test(content) && /^\w+=/m.test(content)) {
        return 'ini';
    }
    
    // Bash/Shell
    if (/\b(sudo|apt|yum|docker|npm|yarn|git|chmod|chown|mkdir|cd|ls|cat|grep|sed|awk|echo|export|source)\s/.test(content)) {
        return 'bash';
    }
    if (/^\w+=[^\s]/m.test(content) && !content.trim().startsWith('<')) {
        return 'bash';
    }
    
    // Context clues for responses/outputs
    if (prevText.includes('response') || prevText.includes('output') || prevText.includes('example')) {
        if (/https?:\/\//.test(content) && content.trim().split('\n').length <= 3) {
            return 'text';
        }
        if (/^\d+$/.test(content.trim())) {
            return 'text';
        }
        if (/^[\w\s\.\-:]+$/.test(content.trim())) {
            return 'text';
        }
    }
    
    // Headers (HTTP)
    if (prevText.includes('header') && /^[\w-]+:\s*.+$/m.test(content)) {
        return 'http';
    }
    
    // Mermaid diagrams
    if (/(sequenceDiagram|graph|flowchart|classDiagram)/.test(content)) {
        return 'mermaid';
    }
    
    // Default to text for short simple content
    if (content.trim().split('\n').length <= 2 && !/[{}\[\]<>]/.test(content)) {
        return 'text';
    }
    
    return 'text';
}

function fixFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n').map(line => line + '\n');
    // Handle last line without newline
    if (lines[lines.length - 1] === '\n') {
        lines[lines.length - 1] = '';
    }
    
    const result = [];
    let i = 0;
    let changes = 0;
    
    while (i < lines.length) {
        if (lines[i].trim() === '```') {
            // Found code block without language
            const prevLines = [];
            for (let j = Math.max(0, i - 5); j < i; j++) {
                if (lines[j].trim()) {
                    prevLines.push(lines[j].trim());
                }
            }
            
            // Collect content
            const contentLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                contentLines.push(lines[i]);
                i++;
            }
            
            // Collect next lines for context
            const nextLines = [];
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                if (lines[j].trim()) {
                    nextLines.push(lines[j].trim());
                }
            }
            
            const blockContent = contentLines.join('');
            const lang = determineLanguage(blockContent, prevLines, nextLines);
            
            // Write fixed version
            result.push(`\`\`\`${lang}\n`);
            result.push(...contentLines);
            if (i < lines.length) {
                result.push(lines[i]); // closing ```
            }
            changes++;
        } else {
            result.push(lines[i]);
        }
        i++;
    }
    
    if (changes > 0) {
        fs.writeFileSync(filepath, result.join(''), 'utf-8');
        return changes;
    }
    return 0;
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: fix_codeblocks.js <file1> [file2] ...');
        process.exit(1);
    }
    
    let total = 0;
    for (const filepath of args) {
        if (!fs.existsSync(filepath)) {
            console.log(`File not found: ${filepath}`);
            continue;
        }
        
        const changes = fixFile(filepath);
        const filename = path.basename(filepath);
        if (changes > 0) {
            console.log(`✓ Fixed ${changes} code blocks in ${filename}`);
            total += changes;
        } else {
            console.log(`  No changes needed in ${filename}`);
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Total: Fixed ${total} code blocks across ${args.length} files`);
}

main();
