import sys
from app.core.database import SessionLocal, Base, engine
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserCreate
from app.core.security import verify_password

# Recreate tables just in case
Base.metadata.create_all(bind=engine)

db = SessionLocal()
user_repo = UserRepository(db)

email = "test@example.com"
password = "securepassword123"

# Check if user already exists
db_user = user_repo.get_by_email(email)
if db_user:
    print(f"User {email} already exists. Deleting to re-test...")
    db.delete(db_user)
    db.commit()

# Create user
print(f"Creating user {email}...")
try:
    user_in = UserCreate(email=email, password=password)
    user = user_repo.create(user_in)
    print("User created successfully with ID:", user.id)
    
    # Verify password
    print("Verifying password...")
    matched = verify_password(password, user.hashed_password)
    if matched:
        print("SUCCESS: Hashing and password verification match!")
    else:
        print("FAILED: Password verification failed!")
        sys.exit(1)
        
except Exception as e:
    print("Error during auth verification:", e)
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    db.close()
