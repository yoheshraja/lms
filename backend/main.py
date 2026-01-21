import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, Form, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles  # ADD THIS IMPORT

from database import Base, engine, SessionLocal
from models import User, Content
from auth import (
    create_access_token,
    verify_password,
    hash_password,
    verify_token,
)

# -------------------------------
# CONFIGURATION - FIXED FOR DEPLOYMENT
# -------------------------------
# Get current directory
BASE_DIR = Path(__file__).parent

# Frontend path - relative to backend folder
FRONTEND_PATH = BASE_DIR.parent / "frontend"
UPLOAD_DIR = "static/uploads"

# Create upload directory
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Init Database Tables
Base.metadata.create_all(bind=engine)

# Init App
app = FastAPI()

# -------------------------------
# MOUNT STATIC FILES FOR FRONTEND
# -------------------------------
# Serve frontend files
@app.get("/")
def redirect_to_home():
    return RedirectResponse("/home")

# Serve frontend HTML files
@app.get("/home")
def home_page():
    return FileResponse(FRONTEND_PATH / "home.html")

@app.get("/login")
def open_login():
    return FileResponse(FRONTEND_PATH / "login.html")

@app.get("/admin")
def open_admin_dashboard():
    return FileResponse(FRONTEND_PATH / "index.html")

@app.get("/admin/upload")
def open_upload():
    return FileResponse(FRONTEND_PATH / "upload.html")

@app.get("/admin/content-library")
def open_content_library():
    return FileResponse(FRONTEND_PATH / "contentlibrary.html")

@app.get("/admin/analytics")
def open_analytics():
    return FileResponse(FRONTEND_PATH / "analytics.html")

@app.get("/admin/user-management")
def open_user_management():
    return FileResponse(FRONTEND_PATH / "usermanagement.html")

@app.get("/admin/settings")
def open_settings():
    return FileResponse(FRONTEND_PATH / "settings.html")

@app.get("/debug")
def open_debug():
    return FileResponse(FRONTEND_PATH / "debug.html")

# Serve static assets (CSS/JS)
@app.get("/style.css")
def get_css():
    return FileResponse(FRONTEND_PATH / "style.css")

@app.get("/script.js")
def get_js():
    return FileResponse(FRONTEND_PATH / "script.js")

@app.get("/home.css")
def get_home_css():
    return FileResponse(FRONTEND_PATH / "home.css")

@app.get("/home.js")
def get_home_js():
    return FileResponse(FRONTEND_PATH / "home.js")

# Serve uploaded files
@app.get("/uploads/{filename}")
def get_uploaded_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

# ... [REST OF YOUR CODE REMAINS THE SAME - database, CORS, auth, API routes] ...

# -------------------------------
# ADMIN CONTENT APIs (Protected)
# -------------------------------
@app.post("/upload-content")
def upload(
    title: str = Form(...),
    topic: str = Form(...),
    description: str = Form(...),
    image: UploadFile | None = None,
    audio: UploadFile | None = None,
    video: UploadFile | None = None,
    current_user: str = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        content = Content(
            title=title,
            topic=topic,
            description=description,
            image=save_file_locally(image),
            audio=save_file_locally(audio),
            video=save_file_locally(video),
            created_by=current_user,
        )
        db.add(content)
        db.commit()
        db.refresh(content)
        return {"message": "Content uploaded successfully", "content_id": content.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading content: {str(e)}")
    finally:
        db.close()

@app.get("/get-contents")
def get_contents(current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        return db.query(Content).order_by(Content.id.desc()).all()
    finally:
        db.close()

@app.get("/get-content/{content_id}")
def get_content(content_id: int, current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        return content
    finally:
        db.close()

@app.put("/update-content/{content_id}")
def update_content(
    content_id: int,
    title: str = Form(...),
    topic: str = Form(...),
    description: str = Form(...),
    image: UploadFile | None = None,
    audio: UploadFile | None = None,
    video: UploadFile | None = None,
    current_user: str = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")

        content.title = title
        content.topic = topic
        content.description = description

        if image and image.filename:
            content.image = save_file_locally(image)
        if audio and audio.filename:
            content.audio = save_file_locally(audio)
        if video and video.filename:
            content.video = save_file_locally(video)

        db.commit()
        return {"message": "Content updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating content: {str(e)}")
    finally:
        db.close()

@app.delete("/delete-content/{content_id}")
def delete_content(content_id: int, current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        db.delete(content)
        db.commit()
        return {"message": "Content deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting content: {str(e)}")
    finally:
        db.close()

# -------------------------------
# USER MANAGEMENT APIs
# -------------------------------
@app.get("/get-users")
def get_users(current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        return db.query(User).all()
    finally:
        db.close()

@app.post("/create-user")
def create_user(
    email: str = Form(...),
    password: str = Form(...),
    current_user: str = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="User already exists")

        new_user = User(email=email, password=hash_password(password))
        db.add(new_user)
        db.commit()
        return {"message": "User created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")
    finally:
        db.close()

# -------------------------------
# ANALYTICS APIs
# -------------------------------
@app.get("/analytics/overview")
def get_analytics_overview(current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        return {
            "total_content": db.query(Content).count(),
            "total_users": db.query(User).count(),
            "views_today": 3200,  # Placeholder
            "active_users": 856,  # Placeholder
            "uploads_this_week": 24,  # Placeholder
        }
    finally:
        db.close()

# -------------------------------
# HEALTH CHECK
# -------------------------------
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Admin Dashboard API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
