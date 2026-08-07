import pickle
import io
import os

class FeatureEngineering:
    def __init__(self, *args, **kwargs):
        pass

class ColumnsDropper:
    def __init__(self, *args, **kwargs):
        pass

class DummyUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module == '__main__' and name == 'FeatureEngineering':
            return FeatureEngineering
        if module == '__main__' and name == 'ColumnsDropper':
            return ColumnsDropper
        return super().find_class(module, name)

path = 'pipeline-nfl-2026.pkl'
print('exists', os.path.exists(path))
with open(path, 'rb') as f:
    raw = f.read()

try:
    obj = pickle.loads(raw)
    print('Loaded type', type(obj))
except Exception as e:
    print('load failed', type(e).__name__, e)
    obj = DummyUnpickler(io.BytesIO(raw)).load()
    print('Loaded with stub type', type(obj))
    print('repr', repr(obj)[:500])
    print('dir sample', [a for a in dir(obj) if not a.startswith('_')][:100])
    if hasattr(obj, '__dict__'):
        print('dict keys', list(obj.__dict__.keys()))
        for k, v in obj.__dict__.items():
            print('  key', k, type(v), repr(v)[:200])

    if hasattr(obj, 'steps'):
        print('steps:', obj.steps)
        for name, step in obj.steps:
            print('step', name, type(step), step.__class__.__name__)
            if hasattr(step, '__dict__'):
                print(' step dict', step.__dict__)
