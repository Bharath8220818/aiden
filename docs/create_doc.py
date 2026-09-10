#!/usr/bin/env python3
import sys

doc = sys.stdin.read()

with open('docs/AIDEN_Comprehensive_Project_Documentation.md', 'w', encoding='utf-8') as f:
    f.write(doc)

print(f'Documentation created: {len(doc)} chars')
