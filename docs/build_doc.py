#!/usr/bin/env python3
doc = open(os.path.join(os.path.dirname(__file__), 'template.md')).read()
with open('docs/AIDEN_Comprehensive_Project_Documentation.md', 'w', encoding='utf-8') as f:
    f.write(doc)
print(f"Created: {len(doc)} chars")
