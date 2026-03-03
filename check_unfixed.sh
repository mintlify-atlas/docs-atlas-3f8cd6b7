#!/bin/bash
# Check for code blocks that are missing language tags (opening ``` without language)
for file in $(find . -name "*.mdx" -o -name "*.md"); do
  # Read file line by line and check for ``` followed by newline (not a closing tag)
  awk '
    /^```$/ && !in_block { 
      # Check next line - if it starts with ```, this is likely an error or closing tag
      getline next
      if (next !~ /^```/) {
        print FILENAME ":" NR ": Missing language tag"
        found = 1
      }
      # Put the line back
      $0 = next
      in_block = 1
    }
    /^```/ && in_block {
      in_block = 0
    }
  ' "$file"
done
