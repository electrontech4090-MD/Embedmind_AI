try:
    from app.main import app
    print("SUCCESS: FastAPI application imported successfully!")
except Exception as e:
    print("FAILED: Import failed with error:")
    import traceback
    traceback.print_exc()
