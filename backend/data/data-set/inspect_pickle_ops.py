import pickletools
import os

path = 'pipeline-nfl-2026.pkl'
print('file exists', os.path.exists(path))
with open(path, 'rb') as f:
    data = f.read()

ops = list(pickletools.genops(data))
for op, arg, pos in ops:
    if op.name in ('GLOBAL', 'STACK_GLOBAL', 'REDUCE', 'BUILD', 'NEWOBJ', 'NEWOBJ_EX'):
        print(op.name, arg)
print('total ops', len(ops))
