import sys
content = sys.stdin.read()
with open('docs/AIDEN_Comprehensive_Project_Documentation.md', 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Written {len(content)} chars')
