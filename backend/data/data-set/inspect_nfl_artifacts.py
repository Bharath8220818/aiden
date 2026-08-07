import os
import pickle
import io

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

print('Pipeline exists:', os.path.exists('pipeline-nfl-2026.pkl'))
with open('pipeline-nfl-2026.pkl', 'rb') as f:
    raw = f.read()
    try:
        obj = pickle.loads(raw)
        print('Loaded normally, type:', type(obj))
    except Exception as e:
        print('Normal load failed:', type(e).__name__, e)
        f2 = io.BytesIO(raw)
        obj = DummyUnpickler(f2).load()
        print('Loaded with DummyUnpickler, type:', type(obj))
        print('Dir sample:', [a for a in dir(obj) if not a.startswith('_')][:100])
        if hasattr(obj, '__dict__'):
            print('Dict keys:', list(obj.__dict__.keys()))
            for k, v in obj.__dict__.items():
                print('  key:', k, 'type:', type(v), 'repr:', repr(v)[:300])
        if hasattr(obj, 'steps'):
            print('Pipeline steps:')
            for name, step in obj.steps:
                print('  step', name, type(step), step.__class__.__name__)
                if hasattr(step, '__dict__'):
                    print('   state', step.__dict__)

try:
    from catboost import CatBoostRegressor
    from pathlib import Path
    root = Path('.')
    model_path = root / 'model_nfl_2026.pkl'
    print('Model exists:', model_path.exists())
    if model_path.exists():
        model = CatBoostRegressor()
        model.load_model(str(model_path))
        print('Model loaded successfully')
        try:
            print('feature_names_:', getattr(model, 'feature_names_', None))
        except Exception as e:
            print('feature_names_ error:', type(e).__name__, e)
        try:
            print('get_params sample:', {k: v for k, v in model.get_params().items() if k in ['iterations', 'learning_rate', 'loss_function', 'depth']})
        except Exception as e:
            print('get_params error:', type(e).__name__, e)
except Exception as e:
    print('CatBoost inspection failed:', type(e).__name__, e)
