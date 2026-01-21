from sqlalchemy import Column, Integer, String, Text, DateTime, func
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)

    # Auto-generated timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<User {self.email}>"


class Content(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    description = Column(Text)

    image = Column(String)
    audio = Column(String)
    video = Column(String)

    # REQUIRED for your FastAPI code
    created_by = Column(String, nullable=False)

    # Correct timezone-aware creation time
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Content {self.title} - {self.topic}>"
