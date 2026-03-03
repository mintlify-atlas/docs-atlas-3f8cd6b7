#!/usr/bin/env python3
"""
Automatically fix code blocks missing language tags in MDX files.
"""
import re
import sys
from pathlib import Path

def determine_language(content, prev_lines, next_lines):
    """Determine the appropriate language tag based on content and context."""
    content_lower = content.lower()
    prev_text = '\n'.join(prev_lines[-5:]).lower()
    next_text = '\n'.join(next_lines[:3]).lower()
    
    # HTTP endpoints
    if re.search(r'^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+/', content, re.MULTILINE):
        return 'http'
    
    # curl commands
    if re.search(r'^\s*curl\s', content, re.MULTILINE):
        return 'bash'
    
    # YAML/Docker Compose
    if re.search(r'^(services:|version:|networks:|volumes:|image:|ports:|environment:)', content, re.MULTILINE):
        return 'yaml'
    
    # Caddyfile
    if re.search(r'^\w+\.(com|dev|local|net)\s*{', content, re.MULTILINE) or 'caddy' in prev_text:
        return 'caddy'
    
    # JSON
    if (content.strip().startswith('{') or content.strip().startswith('[')) and re.search(r'["\']:\s*["\'{[]', content):
        return 'json'
    
    # XML
    if re.search(r'<\?xml|<roblox|<Item|<Properties|</\w+>', content):
        return 'xml'
    
    # Lua
    if re.search(r'(function|local|if\s+.+\s+then|end\b|return\b)', content, re.MULTILINE):
        return 'lua'
    
    # Dockerfile
    if re.search(r'^(FROM|RUN|COPY|WORKDIR|ENTRYPOINT|CMD|EXPOSE|ENV|ARG)\s', content, re.MULTILINE):
        return 'dockerfile'
    
    # SQL
    if re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|DROP|ALTER)\b', content, re.IGNORECASE):
        return 'sql'
    
    # Go
    if re.search(r'\bfunc\s+\w+\(|\btype\s+\w+\s+(struct|interface)|package\s+\w+', content):
        return 'go'
    
    # TypeScript/JavaScript
    if re.search(r'\b(import|export|const|let|var|function|class|interface|type)\s', content):
        return 'typescript'
    
    # INI format
    if re.search(r'^\[.*\]$', content, re.MULTILINE) and re.search(r'^\w+=', content, re.MULTILINE):
        return 'ini'
    
    # Bash/Shell (environment variables, commands)
    if re.search(r'\b(sudo|apt|yum|docker|npm|yarn|git|chmod|chown|mkdir|cd|ls|cat|grep|sed|awk|echo|export|source)\s', content):
        return 'bash'
    if re.search(r'^\w+=[^\s]', content, re.MULTILINE) and not content.strip().startswith('<'):
        return 'bash'
    
    # Check context clues
    if 'response' in prev_text or 'output' in prev_text or 'example' in prev_text:
        # Check if it's simple text output
        if re.search(r'http://|https://', content) and len(content.strip().split('\n')) <= 3:
            return 'text'
        if content.strip().isdigit():
            return 'text'
        if re.search(r'^[\w\s\.\-:]+$', content.strip()):
            return 'text'
    
    # Headers (HTTP)
    if 'header' in prev_text and re.search(r'^[\w-]+:\s*.+$', content, re.MULTILINE):
        return 'http'
    
    # Mermaid diagrams
    if re.search(r'(sequenceDiagram|graph|flowchart|classDiagram)', content):
        return 'mermaid'
    
    # Default to text for short simple content
    if len(content.strip().split('\n')) <= 2 and not re.search(r'[{}\[\]<>]', content):
        return 'text'
    
    return 'text'

def fix_file(filepath):
    """Fix all code blocks without language tags in a file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    result = []
    i = 0
    changes = 0
    
    while i < len(lines):
        if lines[i].strip() == '```':
            # Found a code block without language
            prev_lines = [lines[j].strip() for j in range(max(0, i-5), i) if lines[j].strip()]
            
            # Collect content
            content_lines = []
            i += 1
            start_i = i
            while i < len(lines) and not lines[i].strip().startswith('```'):
                content_lines.append(lines[i])
                i += 1
            
            # Collect next lines for context
            next_lines = [lines[j].strip() for j in range(i+1, min(i+4, len(lines))) if j < len(lines) and lines[j].strip()]
            
            content = ''.join(content_lines)
            lang = determine_language(content, prev_lines, next_lines)
            
            # Write fixed version
            result.append(f'```{lang}\n')
            result.extend(content_lines)
            if i < len(lines):
                result.append(lines[i])  # closing ```
            changes += 1
        else:
            result.append(lines[i])
        i += 1
    
    if changes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(result)
        return changes
    return 0

def main():
    if len(sys.argv) < 2:
        print("Usage: fix_codeblocks.py <file1> [file2] ...")
        sys.exit(1)
    
    total = 0
    for filepath in sys.argv[1:]:
        path = Path(filepath)
        if not path.exists():
            print(f"File not found: {filepath}")
            continue
        
        changes = fix_file(filepath)
        if changes > 0:
            print(f"✓ Fixed {changes} code blocks in {path.name}")
            total += changes
        else:
            print(f"  No changes needed in {path.name}")
    
    print(f"\n{'='*50}")
    print(f"Total: Fixed {total} code blocks across {len(sys.argv)-1} files")

if __name__ == '__main__':
    main()
