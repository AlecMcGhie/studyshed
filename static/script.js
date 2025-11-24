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

let activeConversationId = null;

// render basic chat UI with conversation list
function loadChatUI() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
      <div id="chatLayout" style="display:flex;gap:16px;">
        <aside id="convList" style="width:260px;"></aside>
        <section style="flex:1;">
          <div id="chatBox">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div><strong>Conversations</strong></div>
              <div>
                <button id="newConvBtn">New</button>
                <button id="openModelPopup">Model</button>
              </div>
            </div>
            <div id="chatMessages"></div>
            <form id="chatForm" style="display:flex;margin-top:10px;gap:8px;align-items:flex-end;">
              <textarea id="chatInput" rows="3" style="flex:1;padding:8px;border-radius:6px;border:1px solid #ccc;resize:vertical" placeholder="Type a message (Shift+Enter for newline)"></textarea>
              <button id="sendBtn" type="submit" style="padding:8px 12px;border-radius:6px;">Send</button>
            </form>
          </div>
        </section>
      </div>
    `;

    document.getElementById('chatForm').addEventListener('submit', sendMessage);
    document.getElementById('newConvBtn').addEventListener('click', createNewConversation);
    bindModelPopup();
    fetchAndRenderConversations();

    // Enter = send, Shift+Enter = newline
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // requestSubmit triggers the form 'submit' event so sendMessage runs
                const form = document.getElementById('chatForm');
                if (form.requestSubmit) form.requestSubmit();
                else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        });
    }
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



function fetchAndRenderConversations() {
    fetch('/api/conversations')
        .then(r => r.json())
        .then(data => {
            const listEl = document.getElementById('convList');
            listEl.innerHTML = '';
            const ul = document.createElement('ul');
            ul.style.listStyle='none';
            ul.style.padding='0';
            (data.conversations || []).forEach(conv => {
                const li = document.createElement('li');
                li.style.padding = '8px';
                li.style.borderBottom = '1px solid #eee';
                li.style.cursor = 'pointer';
                li.textContent = new Date(conv.created_at).toLocaleString();
                li.dataset.id = conv.id;
                li.onclick = () => { loadConversation(conv.id); };
                ul.appendChild(li);
            });
            listEl.appendChild(ul);

            // if no active conversation, auto-create or load the first
            if (!activeConversationId && data.conversations && data.conversations.length) {
                loadConversation(data.conversations[0].id);
            }
        })
        .catch(() => {});
}

function createNewConversation() {
    fetch('/api/conversations', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            activeConversationId = data.conversation_id;
            fetchAndRenderConversations();
            clearMessages();
        })
        .catch(() => {});
}

function clearMessages() {
    const messages = document.getElementById('chatMessages');
    if (messages) messages.innerHTML = '';
}

function loadConversation(convId) {
    activeConversationId = convId;
    fetch(`/api/conversations/${convId}`)
        .then(r => r.json())
        .then(data => {
            const messages = document.getElementById('chatMessages');
            messages.innerHTML = '';
            (data.messages || []).forEach(m => {
                const div = document.createElement('div');
                div.className = 'chat-msg ' + (m.role === 'user' ? 'user' : 'bot');
                if (window.marked && window.DOMPurify) {
                    div.innerHTML = DOMPurify.sanitize(marked.parse(m.content || ''));
                } else {
                    div.textContent = m.content || '';
                }
                messages.appendChild(div);
            });
            messages.scrollTop = messages.scrollHeight;
        })
        .catch(() => {});
}

// ensureConversation updated to prefer activeConversationId
function ensureConversation() {
    if (activeConversationId) return Promise.resolve(activeConversationId);
    return fetch('/api/conversations', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            activeConversationId = data.conversation_id;
            fetchAndRenderConversations();
            return activeConversationId;
        });
}

let selectedModel = null;

// Model selection handler for popup
function bindModelPopup() {
    const openBtn = document.getElementById('openModelPopup');
    if (!openBtn) return;
    openBtn.onclick = function() {
        fetch('/api/models')
            .then(resp => resp.json())
            .then(data => {
                const models = data.models || [];
                const list = document.getElementById('modelList');
                if (!list) return;
                list.innerHTML = '';
                models.forEach(model => {
                    const li = document.createElement('li');
                    li.textContent = model.name || 'Unknown';
                    if (model.active) li.classList.add('selected');
                    li.onclick = () => {
                        selectedModel = model.name;
                        // visually mark selection
                        Array.from(list.children).forEach(c => c.classList.remove('selected'));
                        li.classList.add('selected');
                        // set active immediately (optional)
                        fetch('/api/set_active_model', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({model_name: selectedModel})
                        }).then(()=> {
                            setModelIndicator();
                            document.getElementById('modelModal').style.display = 'none';
                        });
                    };
                    list.appendChild(li);
                });
                document.getElementById('modelModal').style.display = 'flex';
            });
    };
    const closeBtn = document.getElementById('closeModelModal');
    if (closeBtn) closeBtn.onclick = () => { document.getElementById('modelModal').style.display = 'none'; };
}

// Show current model in chat UI
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
                const name = active ? active.name : '(none)';
                const el = document.getElementById('currentModelName');
                if (el) el.textContent = name;
                updateActiveModelDisplay(name);
            }
        })
        .catch(()=>{});
}
// Load Chat UI by default on page load
window.onload = function() {
    document.getElementById('sidebar').classList.remove('visible');
    document.getElementById('openSidebarBtn').classList.remove('hide-toggle-btn');
    // ensure a conversation id exists for this session
    ensureConversation().catch(()=>{});
    // Set the initial landing page 
    setActive(START_SCREEN || 'modelhub');
    loadChatUI();
    setModelIndicator();
};