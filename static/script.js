// Selected start page
const START_SCREEN = 'chat'; // Options: 'chat', 'flashcards', 'podcast', 'calendar', 'modelhub'

function openSidebar() {
    document.getElementById('sidebar').classList.add('visible');
    document.getElementById('openSidebarBtn').classList.add('hide-toggle-btn');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('visible');
    document.getElementById('openSidebarBtn').classList.remove('hide-toggle-btn');
}

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

function loadChatUI() {
    document.getElementById('titleBar').innerText = "Chat";
    document.getElementById('mainContent').innerHTML = `
        <div id="chatBox">
            <div id="modelIndicator" style="margin-bottom:6px;font-size:1em;color:#7B8DAB;font-weight:500;">Current Model: <span id="currentModelName"></span></div>
            <div id="chatMessages"></div>
            <form id="chatForm" onsubmit="sendMessage(event)" style="display:flex;gap:8px;">
                <input id="chatInput" type="text" placeholder="Ask your question..." style="flex:1;padding:7px;border-radius:6px;border:1px solid #ccd4df;">
                <button id="openModelPopup" type="button" style="padding:9px 22px;background:#7B8DAB;border:none;color:white;border-radius:6px;font-size:1em;margin-right:8px;">Model</button>
                <button type="submit" style="padding:9px 22px;background:#4A90E2;border:none;color:white;border-radius:6px;font-size:1em;">Send</button>
            </form>
        </div>
        <div id="modelModal" class="modal" style="display:none;">
            <div class="modal-content" style="background:#fff;padding:1em 1.5em;width:320px;border-radius:10px;position:relative;">
                <span id="closeModelModal" style="position:absolute;top:10px;right:18px; font-size:1.7em; cursor:pointer;">&times;</span>
                <h2>Select Model</h2>
                <ul id="modelList" style="list-style:none;padding:0;margin:0;"></ul>
                <br><br/>
                <button id="openModelPage" onclick="setActive('modelhub')" style="margin-bottom:12px;padding:8px 16px;background:#4A90E2;border:none;color:white;border-radius:6px;font-size:1em;cursor:pointer;">Go to Model Hub</button>

            </div>
        </div>
    `;
    bindChatHandler();
    bindModelPopup();
    setModelIndicator();
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
    document.getElementById('mainContent').innerHTML = `<div id="modelList" class="model-hub-grid"></div>`;

    fetch('/api/models')
    .then(resp => resp.json())
    .then(data => {
        if (data.error) {
            document.getElementById('modelList').innerHTML = `<p style="color:red;">${data.error}</p>`;
            return;
        }
        document.getElementById('modelList').innerHTML =
            data.models.map(model => `
                <div class="model-card${model.active ? ' active-model' : ''}">
                    <div class="model-name">${model.name || "Unknown"}</div>
                    <div class="model-family"><strong>Family:</strong> ${model.family}</div>
                    <div class="model-format"><strong>Format:</strong> ${model.format}</div>
                    <div class="model-params"><strong>Params:</strong> ${model.parameter_size}</div>
                    <div class="model-quant"><strong>Quantization:</strong> ${model.quantization_level}</div>
                    <div class="model-license"><strong>License:</strong> ${model.license}</div>
                    <div class="model-size"><strong>Size:</strong> ${model.size ? (model.size / 1e6).toFixed(1) : "?"} MB</div>
                    <div class="model-digest"><strong>Digest:</strong> ${model.digest}</div>
                    <div class="model-modified"><strong>Modified:</strong> ${model.modified_at}</div>
                    <div class="model-actions">
                        ${model.active 
                            ? '<span style="color:green;font-weight:bold;">Active</span>'
                            : '<button class="model-btn activate">Activate</button>'}
                    </div>
                </div>
            `).join('');
    });
}




function bindChatHandler() {
    var form = document.getElementById('chatForm');
    if (form) {
        form.onsubmit = sendMessage;
    }
}

function ensureConversation() {
    let conv = localStorage.getItem('conversation_id');
    if (conv) return Promise.resolve(conv);
    return fetch('/api/conversations', { method: 'POST' })
        .then(r => r.json())
        .then(j => {
            if (j.conversation_id) {
                localStorage.setItem('conversation_id', j.conversation_id);
                return j.conversation_id;
            }
            throw new Error('Failed to create conversation');
        });
}

function sendMessage(e) {
    e.preventDefault();
    var input = document.getElementById('chatInput');
    var messages = document.getElementById('chatMessages');
    if (!input || !messages) return;
    var text = input.value.trim();
    if (text === '') return;

    // USER message (render markdown safely)
    var msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg user';
    if (window.marked && window.DOMPurify) {
        msgDiv.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
        msgDiv.textContent = text;
    }
    messages.appendChild(msgDiv);

    // Model reply placeholder
    var replyDiv = document.createElement('div');
    replyDiv.className = 'chat-msg bot';
    replyDiv.innerHTML = '';
    messages.appendChild(replyDiv);

    ensureConversation()
    .then(conv_id => {
        return fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: text, conversation_id: conv_id})
        });
    })
    .then(resp => {
        if (!resp.body) throw new Error('No response body');
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        function readChunk() {
            return reader.read().then(({ done, value }) => {
                if (done) {
                    messages.scrollTop = messages.scrollHeight;
                    return;
                }
                let chunkText = decoder.decode(value, { stream: true });
                // server yields lines of JSON per chunk; split and parse each
                chunkText.split('\n').forEach(line => {
                    if (!line.trim()) return;
                    try {
                        let data = JSON.parse(line);
                        if (data.reply) {
                            accumulated += data.reply;
                            if (window.marked && window.DOMPurify) {
                                replyDiv.innerHTML = DOMPurify.sanitize(marked.parse(accumulated));
                            } else {
                                replyDiv.textContent = accumulated;
                            }
                            messages.scrollTop = messages.scrollHeight;
                        }
                    } catch (e) {
                        // ignore non-JSON partial fragments
                    }
                });
                return readChunk();
            });
        }
        return readChunk();
    })
    .catch(error => {
        console.error('Error:', error);
        replyDiv.textContent = 'Error: ' + error.message;
        replyDiv.className = 'chat-msg error';
    });

    input.value = '';
    messages.scrollTop = messages.scrollHeight;
}

// Load Chat UI by default on page load
window.onload = function() {
    document.getElementById('sidebar').classList.remove('visible');
    document.getElementById('openSidebarBtn').classList.remove('hide-toggle-btn');
    // ensure a conversation id exists for this session
    ensureConversation().catch(()=>{});
    // Set the initial landing page 
    setActive(START_SCREEN || 'modelhub');
};

let selectedModel = null;

// Model selection handler for popup
function bindModelPopup() {
    document.getElementById('openModelPopup').onclick = function() {
        fetch('/api/models')
            .then(resp => resp.json())
            .then(data => {
                const models = data.models;
                const list = document.getElementById('modelList');
                list.innerHTML = '';
                models.forEach(model => {
                    const li = document.createElement('li');
                    li.textContent = model.name || model;
                    if (model.active) li.className = 'selected';
                    li.onclick = () => {
                        selectedModel = model.name || model;
                        // Set the active model on the backend
                        fetch('/api/set_active_model', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({model_name: selectedModel})
                        })
                        .then(res => res.json())
                        .then(result => {
                            // Optionally show confirmation
                            document.getElementById('modelModal').style.display = 'none';
                            // Update display of active model, e.g. in chat UI
                            updateActiveModelDisplay(selectedModel);
                            setModelIndicator();
                        });
                    };
                    list.appendChild(li);
                });
                document.getElementById('modelModal').style.display = 'flex';
            });
    };
    document.getElementById('closeModelModal').onclick = function() {
        document.getElementById('modelModal').style.display = 'none';
    };
}

// (Optional) Show current model in chat UI
function updateActiveModelDisplay(modelName) {
    let titleBar = document.getElementById('titleBar');
    if (titleBar) {
        titleBar.innerHTML = `Chat <span style="font-size:0.69em;color:#7B8DAB;padding-left:8px;">(${modelName})</span>`;
    }
}

function setModelIndicator() {
    fetch('/api/models')
        .then(res => res.json())
        .then(data => {
            if (data && data.models) {
                const active = data.models.find(m => m.active);
                document.getElementById('currentModelName').textContent = active ? active.name : "None";
            }
        });
}
