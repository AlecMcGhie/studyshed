// Sidebar management
function openSidebar() {
    document.getElementById('sidebar').classList.add('visible');
    document.getElementById('openSidebarBtn').classList.add('hide-toggle-btn');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('visible');
    document.getElementById('openSidebarBtn').classList.remove('hide-toggle-btn');
}

// Set active feature and load UI
function setActive(feature) {
    let menu = document.getElementById('menu');
    Array.from(menu.children).forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.getElementById('menu-' + feature);
    if (activeBtn) activeBtn.classList.add('active');

    // Call the appropriate UI loader
    switch (feature) {
        case 'chat':
            loadChatUI();
            break;
        case 'flashcards':
            loadFlashcardsUI();
            break;
        case 'podcast':
            loadPodcastUI();
            break;
        case 'calendar':
            loadCalendarUI();
            break;
        case 'modelhub':
            loadModelHubUI();
            break;
        default:
            document.getElementById('mainContent').innerHTML = "<p>Feature coming soon.</p>";
    }

    // Automatically close the sidebar after a choice is made
    closeSidebar()
}

// UI Loaders
function loadChatUI() {
    document.getElementById('titleBar').innerText = "Chat";
    document.getElementById('mainContent').innerHTML = `
        <div id="chatBox">
            <div id="chatMessages"></div>
            <form id="chatForm" onsubmit="sendMessage(event)" style="display:flex;gap:8px;">
                <input id="chatInput" type="text" placeholder="Ask your question..." style="flex:1;padding:7px;border-radius:6px;border:1px solid #ccd4df;">
                <button type="submit" style="padding:9px 22px;background:#4A90E2;border:none;color:white;border-radius:6px;font-size:1em;">Send</button>
            </form>
        </div>
    `;
    bindChatHandler();
}

function loadFlashcardsUI() {
    document.getElementById('titleBar').innerText = "Flashcards";
    document.getElementById('mainContent').innerHTML = "<p>Flashcards feature coming soon.</p>";
}

function loadPodcastUI() {
    document.getElementById('titleBar').innerText = "Podcast";
    document.getElementById('mainContent').innerHTML = "<p>Podcast feature coming soon.</p>";
}

function loadCalendarUI() {
    document.getElementById('titleBar').innerText = "Calendar";
    document.getElementById('mainContent').innerHTML = "<p>Calendar feature coming soon.</p>";
}

function loadModelHubUI() {
    document.getElementById('titleBar').innerText = "Model Hub";
    document.getElementById('mainContent').innerHTML = `
        <h2>My Models</h2>
        <div id="myModels" class="model-hub-grid"></div>
        <h2>Browse Models</h2>
        <div class="search-container">
            <input type="text" id="modelSearch" placeholder="Search for models..." onkeyup="filterModels()">
        </div>
        <div id="browseModels" class="model-hub-grid"></div>
    `;
    fetchModels();
    loadBrowseModels();
}

// Model Hub functions
function fetchModels() {
    fetch('/api/models')
        .then(resp => resp.json())
        .then(data => {
            if (data.error) {
                document.getElementById('myModels').innerHTML = `<p style="color:red;">${data.error}</p>`;
                return;
            }
            const grid = document.getElementById('myModels');
            grid.innerHTML = data.models.map(model => `
                <div class="model-card${model.active ? ' active-model' : ''}">
                    <div class="model-name">${model.name || "Unknown"}</div>
                    <div class="model-family"><strong>Family:</strong> ${model.family}</div>
                    <div class="model-size"><strong>Size:</strong> ${model.size ? (model.size / 1e9).toFixed(2) : "?"} GB</div>
                    <div class="model-actions">
                        ${model.active 
                            ? '<span class="active-status">Active</span>'
                            : `<button class="model-btn activate-btn" data-model="${model.name}">Activate</button>`
                        }
                        <button class="model-btn delete-btn" data-model="${model.name}">Delete</button>
                    </div>
                </div>
            `).join('');
            addModelActionListeners();
        });
}

function addModelActionListeners() {
    document.querySelectorAll('.activate-btn').forEach(button => {
        button.onclick = () => activateModel(button.dataset.model);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = () => deleteModel(button.dataset.model);
    });
}

function activateModel(modelName) {
    fetch('/api/models/activate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model_name: modelName})
    }).then(() => fetchModels());
}

function deleteModel(modelName) {
    if (confirm(`Are you sure you want to delete ${modelName}?`)) {
        fetch('/api/models/delete', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({model_name: modelName})
        }).then(() => fetchModels());
    }
}

function loadBrowseModels() {
    const popularModels = ["gemma:2b", "llama2:7b", "mistral:7b", "codellama:7b", "phi:latest"];
    const grid = document.getElementById('browseModels');
    grid.innerHTML = popularModels.map(model => `
        <div class="model-card" data-model-name="${model}">
            <div class="model-name">${model}</div>
            <div class="model-actions">
                <button class="model-btn download-btn" data-model="${model}">Download</button>
                <div class="progress-container" id="progress-${model}" style="display:none;">
                    <div class="progress-bar"></div>
                    <div class="progress-label"></div>
                </div>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.download-btn').forEach(button => {
        button.onclick = () => downloadModel(button.dataset.model);
    });
}

function downloadModel(modelName) {
    const progressContainer = document.getElementById(`progress-${modelName}`);
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressLabel = progressContainer.querySelector('.progress-label');
    progressContainer.style.display = 'block';

    fetch('/api/models/download', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model_name: modelName})
    }).then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        function processText({ done, value }) {
            if (done) {
                progressLabel.innerText = 'Download complete!';
                fetchModels(); // Refresh local models list
                return;
            }
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            lines.forEach(line => {
                if (line) {
                    const data = JSON.parse(line);
                    if (data.total && data.completed) {
                        const percentage = Math.round((data.completed / data.total) * 100);
                        progressBar.style.width = percentage + '%';
                        progressLabel.innerText = `${percentage}%`;
                    } else if (data.status) {
                        progressLabel.innerText = data.status;
                    }
                }
            });
            return reader.read().then(processText);
        }
        return reader.read().then(processText);
    });
}

function filterModels() {
    const filter = document.getElementById('modelSearch').value.toLowerCase();
    document.querySelectorAll('#browseModels .model-card').forEach(card => {
        const modelName = card.dataset.modelName.toLowerCase();
        card.style.display = modelName.includes(filter) ? "" : "none";
    });
}

// Chat functions
function bindChatHandler() {
    document.getElementById('chatForm').onsubmit = sendMessage;
}

function sendMessage(e) {
    e.preventDefault();
    var input = document.getElementById('chatInput');
    var messages = document.getElementById('chatMessages');
    if (!input || !messages || !input.value.trim()) return;

    appendMessage(input.value, 'user', messages);

    const replyDiv = appendMessage('', 'bot', messages);

    fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: input.value.trim()})
    })
    .then(handleStream(replyDiv, messages))
    .catch(error => console.error('Error:', error));

    input.value = '';
}

function appendMessage(content, type, container) {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = content;
    msgDiv.className = `chat-msg ${type}`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgDiv;
}

function handleStream(element, container) {
    return function(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        function readChunk() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    container.scrollTop = container.scrollHeight;
                    return;
                }
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\\n');
                lines.forEach(line => {
                    if (line) {
                        const data = JSON.parse(line);
                        if (data.reply) {
                            element.textContent += data.reply;
                        }
                    }
                });
                container.scrollTop = container.scrollHeight;
                readChunk();
            });
        }
        readChunk();
    }
}

// Initial load
window.onload = () => {
    document.getElementById('sidebar').classList.remove('visible');
    document.getElementById('openSidebarBtn').classList.remove('hide-toggle-btn');
    setActive('modelhub');
};
