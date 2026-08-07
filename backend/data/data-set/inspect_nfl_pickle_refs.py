import os
import pickletools

path = 'pipeline-nfl-2026.pkl'
print('File exists:', os.path.exists(path))
print('File size:', os.path.getsize(path))

with open(path, 'rb') as f:
    data = f.read()

print('First 120 bytes:', data[:120])
print('\nReferenced globals:')
for op, arg, pos in pickletools.genops(data):
    if op.name in ('GLOBAL', 'STACK_GLOBAL'):
        print(op.name, arg)
