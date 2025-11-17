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

function bindChatHandler() {
    var form = document.getElementById('chatForm');
    if (form) {
        form.onsubmit = sendMessage;
    }
}

function sendMessage(e) {
    e.preventDefault();
    var input = document.getElementById('chatInput');
    var messages = document.getElementById('chatMessages');
    if (!input || !messages) return;
    var text = input.value.trim();
    if (text === '') return;

    // USER message right
    var msgDiv = document.createElement('div');
    msgDiv.textContent = text;
    msgDiv.className = 'chat-msg user';
    messages.appendChild(msgDiv);

    // Model reply placeholder
    var replyDiv = document.createElement('div');
    replyDiv.textContent = '';
    replyDiv.className = 'chat-msg bot';
    messages.appendChild(replyDiv);

    // POST to backend (Flask endpoint)
    fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: text})
    })
    .then(resp => {
        if (!resp.body) throw new Error('No response body');
        const reader = resp.body.getReader();
        let decoder = new TextDecoder();

        function readChunk() {
            return reader.read().then(({ done, value }) => {
                if (done) {
                    messages.scrollTop = messages.scrollHeight;
                    return;
                }
                let chunkText = decoder.decode(value, {stream: true});
                chunkText.split('\n').forEach(line => {
                    if (!line.trim()) return;
                    try {
                        let data = JSON.parse(line);
                        if (data.reply) {
                            replyDiv.textContent += data.reply;
                            messages.scrollTop = messages.scrollHeight;
                        }
                    } catch (e) {
                        // Ignore parse errors
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
    setActive('chat');
};
