import pickle
import io
import pickletools
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

root = Path(__file__).resolve().parent
for filename in ['pipeline-nfl-2026.pkl', 'model_nfl_2026.pkl']:
    path = root / filename
    print('---', filename, '---')
    print('exists', path.exists())
    if not path.exists():
        continue
    print('size', path.stat().st_size)
    data = path.read_bytes()
    print('first bytes', data[:120])
    if filename == 'pipeline-nfl-2026.pkl':
        try:
            obj = pickle.loads(data)
            print('loaded normally', type(obj))
            if hasattr(obj, 'steps'):
                print('steps', [(name, type(step).__name__) for name, step in obj.steps])
        except Exception as e:
            print('normal load failed', type(e).__name__, e)
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
            obj = DummyUnpickler(io.BytesIO(data)).load()
            print('loaded with dummy', type(obj))
            if hasattr(obj, 'steps'):
                print('steps', [(name, type(step).__name__) for name, step in obj.steps])
    if filename == 'model_nfl_2026.pkl':
        print('pickle globals:')
        for op, arg, pos in pickletools.genops(data):
            if op.name in ('GLOBAL', 'STACK_GLOBAL'):
                print(op.name, arg, pos)
        try:
            model = pickle.loads(data)
            print('model loaded', type(model))
            print('has predict', hasattr(model, 'predict'))
            print('feature_names_', getattr(model, 'feature_names_', None))
            print('n_features_in_', getattr(model, 'n_features_in_', None))
            print('params sample', {k: v for k, v in model.get_params().items() if k in ['iterations','learning_rate','loss_function','depth','random_seed']})
        except Exception as e:
            print('pickle load failed', type(e).__name__, e)
