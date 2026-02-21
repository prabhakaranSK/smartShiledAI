from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import User
from app.schemas.user_schema import UserCreate, UserLogin
from app.auth.password import hash_password, verify_password
from app.auth.jwt_handler import create_access_token


router = APIRouter(prefix="/auth", tags=["Authentication"])


# ==============================
# SIGNUP
# ==============================
@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):

    # check existing user
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # hash password
    hashed_pwd = hash_password(user.password)

    # create user
    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_pwd
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}


# ==============================
# LOGIN
# ==============================
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # create JWT token
    token = create_access_token({"sub": db_user.email})

    return {
        "access_token": token,
        "token_type": "bearer"
    }
