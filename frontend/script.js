/********************************************
 * CONFIG
 ********************************************/
const API = "http://127.0.0.1:8000";

/********************************************
 * AUTH CHECK + APP INIT
 ********************************************/

document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    const token = sessionStorage.getItem("token");

    console.log("[AUTH] Page loaded:", currentPath);
    console.log("[AUTH] Has token:", !!token);

    // RULE 1: On login page with valid token → redirect to admin
    if (currentPath === "/login") {
        if (token) {
            console.log("[AUTH] Login page with token - redirecting to /admin");
            window.location.replace("/admin");
        }
        // Don't initialize anything on login page
        return;
    }

    // RULE 2: On admin pages without token → redirect to login
    if (currentPath.startsWith("/admin")) {
        if (!token) {
            console.log("[AUTH] Admin page without token - redirecting to /login");
            window.location.replace("/login");
            return;
        }
        
        // We have a token and we're on an admin page - initialize app
        console.log("[AUTH] Authenticated - initializing app");
        initializeApp();
    }
});

/********************************************
 * INITIALIZE APP
 ********************************************/
function initializeApp() {
    console.log("[APP] Initializing application...");
    initializeFileInputs();
    setActiveMenuItem();
    displayUserInfo();
    loadPageSpecificData();
}

/********************************************
 * DISPLAY LOGGED IN USER
 ********************************************/
function displayUserInfo() {
    const email = sessionStorage.getItem("userEmail");
    if (!email) return;

    document.querySelectorAll(".admin-name").forEach(el => {
        el.textContent = email.split("@")[0];
    });
}

/********************************************
 * PAGE LOADERS
 ********************************************/
function loadPageSpecificData() {
    const page = window.location.pathname;

    if (page === "/admin") {
        loadRecentContent();
        loadDashboardStats();
    }

    if (page.includes("/admin/content-library")) loadRecentContent();
    if (page.includes("/admin/analytics")) loadAnalyticsData();
    if (page.includes("/admin/user-management")) loadUsersData();
}

/********************************************
 * FILE INPUT HANDLER
 ********************************************/
function initializeFileInputs() {
    document.querySelectorAll("input[type='file']").forEach(input => {
        input.addEventListener("change", function () {
            const label = this.nextElementSibling;
            if (!label) return;

            const textSpan = label.querySelector(".file-input-text");

            if (this.files.length > 0) {
                textSpan.textContent = this.files[0].name;
                label.classList.add("file-selected");
            } else {
                textSpan.textContent = textSpan.dataset.default;
                label.classList.remove("file-selected");
            }
        });
    });

    document.querySelectorAll(".file-input-text").forEach(span => {
        span.dataset.default = span.textContent;
    });
}

/********************************************
 * SET ACTIVE MENU ITEM
 ********************************************/
function setActiveMenuItem() {
    const current = window.location.pathname;
    document.querySelectorAll(".menu-item").forEach(item => {
        const href = item.getAttribute("href");
        item.classList.toggle("active", current.startsWith(href));
    });
}

/********************************************
 * HANDLE API ERRORS (CENTRALIZED)
 ********************************************/
async function handleApiResponse(response) {
    if (response.status === 401) {
        console.log("[AUTH] 401 Unauthorized - session expired");
        sessionStorage.clear();
        window.location.replace("/login");
        throw new Error("Session expired");
    }
    return response;
}

/********************************************
 * UPLOAD CONTENT
 ********************************************/
async function uploadContent() {
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    const title = document.getElementById("title")?.value;
    const topic = document.getElementById("topic")?.value;
    const description = document.getElementById("desc")?.value;
    const image = document.getElementById("image")?.files[0];
    const audio = document.getElementById("audio")?.files[0];
    const video = document.getElementById("video")?.files[0];

    if (!title || !topic) {
        showNotification("Please fill all required fields", "error");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("topic", topic);
    formData.append("description", description);
    
    if (image) formData.append("image", image);
    if (audio) formData.append("audio", audio);
    if (video) formData.append("video", video);

    try {
        const res = await fetch(`${API}/upload-content`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        await handleApiResponse(res);

        if (!res.ok) throw new Error(await res.text());

        showNotification("Content uploaded successfully!", "success");
        clearForm();

    } catch (err) {
        console.error(err);
        if (err.message !== "Session expired") {
            showNotification("Upload failed: " + err.message, "error");
        }
    }
}

/********************************************
 * LOAD RECENT CONTENT
 ********************************************/
async function loadRecentContent() {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API}/get-contents`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        await handleApiResponse(res);

        if (res.ok) {
            displayRecentContent(await res.json());
        }
    } catch (e) {
        if (e.message !== "Session expired") {
            console.error("Load content error:", e);
        }
    }
}

function displayRecentContent(contents) {
    const body = document.querySelector(".content-table tbody");
    if (!body) return;

    body.innerHTML = "";

    contents.slice(0, 5).forEach(c => {
        body.innerHTML += `
            <tr>
                <td class="content-title">${c.title}</td>
                <td>${c.topic}</td>
                <td>${new Date(c.created_at).toLocaleDateString()}</td>
                <td><span class="status-published">Published</span></td>
                <td>
                    <div class="content-actions">
                        <button class="action-btn"><i class="fas fa-edit"></i></button>
                        <button class="action-btn"><i class="fas fa-trash"></i></button>
                        <button class="action-btn"><i class="fas fa-eye"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

/********************************************
 * DASHBOARD STATS
 ********************************************/
async function loadDashboardStats() {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API}/analytics/overview`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        await handleApiResponse(res);

        if (res.ok) {
            updateDashboardStats(await res.json());
        }
    } catch (e) {
        if (e.message !== "Session expired") {
            console.error("Stats error:", e);
        }
    }
}

function updateDashboardStats(s) {
    const stats = document.querySelectorAll(".stat-value");
    if (!stats.length) return;

    stats[0].textContent = s.total_content;
    stats[1].textContent = s.views_today.toLocaleString();
    stats[2].textContent = s.active_users;
    stats[3].textContent = s.uploads_this_week;
}

/********************************************
 * LOAD ANALYTICS DATA
 ********************************************/
async function loadAnalyticsData() {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API}/analytics/overview`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        await handleApiResponse(res);

        if (res.ok) {
            const data = await res.json();
            console.log("Analytics data loaded:", data);
            // Add your analytics display logic here
        }
    } catch (e) {
        if (e.message !== "Session expired") {
            console.error("Analytics error:", e);
        }
    }
}

/********************************************
 * LOAD USERS
 ********************************************/
async function loadUsersData() {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API}/get-users`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        await handleApiResponse(res);

        if (res.ok) {
            displayUsers(await res.json());
        }
    } catch (e) {
        if (e.message !== "Session expired") {
            console.error("Users error:", e);
        }
    }
}

function displayUsers(users) {
    const body = document.querySelector(".data-table tbody");
    if (!body) return;

    body.innerHTML = "";

    users.forEach(user => {
        body.innerHTML += `
            <tr>
                <td>
                    <div class="row-flex">
                        <div class="user-avatar small"><i class="fas fa-user"></i></div>
                        <div>
                            <div class="content-title">${user.email.split('@')[0]}</div>
                            <div class="role-subtext">User</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>User</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td><span class="status-published">Active</span></td>
                <td>
                    <div class="content-actions">
                        <button class="action-btn"><i class="fas fa-edit"></i></button>
                        <button class="action-btn"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

/********************************************
 * LOGOUT
 ********************************************/
function logout() {
    console.log("[AUTH] Logging out...");
    sessionStorage.clear();
    window.location.replace("/login");
}

/********************************************
 * NOTIFICATIONS
 ********************************************/
function showNotification(message, type = "success") {
    const div = document.createElement("div");
    div.className = `notification ${type}`;
    div.textContent = message;

    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        background: ${type === "success" ? "#4caf50" : "#f44336"};
        color: white;
        z-index: 9999;
        opacity: 0;
        transition: opacity .3s;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

    document.body.appendChild(div);

    setTimeout(() => (div.style.opacity = 1), 20);
    setTimeout(() => {
        div.style.opacity = 0;
        setTimeout(() => div.remove(), 300);
    }, 2500);
}

/********************************************
 * SEARCH
 ********************************************/
function handleSearch(inputId, tableId) {
    const term = document.getElementById(inputId).value.toLowerCase();
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);

    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
    });
}

/********************************************
 * CLEAR FORM
 ********************************************/
function clearForm() {
    document.querySelectorAll('input[type="text"], input[type="file"], textarea').forEach(input => {
        input.value = '';
    });
    
    // Reset file input labels
    document.querySelectorAll('.file-input-text').forEach(span => {
        span.textContent = span.dataset.default || 'Choose file';
    });
    
    document.querySelectorAll('.file-input-label').forEach(label => {
        label.classList.remove('file-selected');
    });
}