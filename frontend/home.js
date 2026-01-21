let translateLoaded = false;

function googleTranslateElementInit(){
    new google.translate.TranslateElement({
        pageLanguage:"en"
    }, "google_translate_element");
    document.getElementById('google_translate_element').style.display = 'block';
}

function loadGoogleTranslate() {
    if(translateLoaded) return;
    
    var script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
    translateLoaded = true;
}

document.addEventListener("DOMContentLoaded", loadPublicContent);

async function loadPublicContent() {
    const grid = document.getElementById("publicContentGrid");
    const noResults = document.getElementById("noResults");

    try {
        const res = await fetch("/public/contents");
        if (!res.ok) throw new Error("Failed to load content");

        const data = await res.json();

        if (data.length === 0) {
            noResults.classList.remove("hidden-element");
            grid.innerHTML = "";
            return;
        }

        renderCards(data);

    } catch (e) {
        console.error(e);
        grid.innerHTML = `<p class="error-msg">Server error. Please try again later.</p>`;
    }
}

function renderCards(contents) {
    const grid = document.getElementById("publicContentGrid");
    grid.innerHTML = "";

    contents.forEach(item => {
        let media = item.image
            ? `<img src="/uploads/${item.image}" alt="${item.title}">`
            : `<i class="fas ${item.video ? 'fa-video' : item.audio ? 'fa-music' : 'fa-file-alt'} media-icon"></i>`;

        let badges = `
            ${item.video ? '<span class="file-badge"><i class="fas fa-video"></i> Video</span>' : ''}
            ${item.audio ? '<span class="file-badge"><i class="fas fa-music"></i> Audio</span>' : ''}
            ${item.image ? '<span class="file-badge"><i class="fas fa-image"></i> Image</span>' : ''}
        `;

        const dateStr = new Date(item.created_at).toLocaleDateString();

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-media">${media}</div>
            <div class="card-body">
                <div class="card-topic">${item.topic}</div>
                <h3 class="card-title">${item.title}</h3>
                <p class="card-desc">${item.description || "No description."}</p>

                <div class="card-footer">
                    <div class="file-badges">${badges}</div>
                    <span>${dateStr}</span>
                </div>
            </div>
        `;

        if (item.video || item.audio || item.image) {
            const file = item.video || item.audio || item.image;
            card.onclick = () => window.open(`/uploads/${file}`, "_blank");
            card.style.cursor = "pointer";
        }

        grid.appendChild(card);
    });
}

function filterContent() {
    const input = document.getElementById("searchInput").value.toLowerCase();
    const cards = document.querySelectorAll(".card");
    let found = false;

    cards.forEach(card => {
        const title = card.querySelector(".card-title").innerText.toLowerCase();
        const body = card.querySelector(".card-desc").innerText.toLowerCase();
        const topic = card.querySelector(".card-topic").innerText.toLowerCase();

        const visible = title.includes(input) || body.includes(input) || topic.includes(input);

        card.style.display = visible ? "flex" : "none";
        if (visible) found = true;
    });

    document.getElementById("noResults").classList.toggle("hidden-element", found);



}



