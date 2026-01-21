from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# -----------------------------------
# DATABASE LOCATION (absolute path)
# -----------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data.db")

DATABASE_URL = f"sqlite:///{DB_PATH}"

# -----------------------------------
# ENGINE
# -----------------------------------
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite + multithreading
    echo=False                                 # Set True if you want SQL logs
)

# -----------------------------------
# SESSION
# -----------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# -----------------------------------
# BASE MODEL
# -----------------------------------
Base = declarative_base()
