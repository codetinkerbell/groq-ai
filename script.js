const sendButton = document.getElementById('send-button');
const newChatButton = document.getElementById('new-chat-button'); // NEW BUTTON
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Sidebar elements
const toggleBtn = document.getElementById('toggle-history');
const historyPanel = document.getElementById('chat-history');
const historyList = document.getElementById('history-list');

// Chat storage
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
let savedChats = JSON.parse(localStorage.getItem('savedChats')) || [];
let currentChatTitle = null;

// Groq API
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = "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"; // Replace with your actual API key

// Toggle sidebar
toggleBtn.addEventListener('click', () => {
  historyPanel.classList.toggle('active');
});

// Send chat function
async function sendChat() {
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  addToChatHistory("user", userMessage);

  try {
    const MAX_HISTORY = 20; // Prevent exceeding token limits
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: chatHistory.slice(-MAX_HISTORY).map(entry => ({
          role: entry.sender === "user" ? "user" : "assistant",
          content: entry.message
        }))
      })
    });

    const data = await response.json();
    const groqMessage = data.choices?.[0]?.message?.content || "No response received.";
    addToChatHistory("groq", groqMessage);

    localStorage.setItem('chatHistory', JSON.stringify(chatHistory)); // Persist chat history

  } catch (error) {
    console.error('Error:', error);
    addToChatHistory("groq", "Sorry, an error occurred. Please try again.");
  }

  userInput.value = '';
}

sendButton.addEventListener('click', sendChat);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

// **NEW CHAT BUTTON FUNCTIONALITY**
newChatButton.addEventListener('click', () => {
  if (chatHistory.length > 0) {
    autoSaveChat(); // Save previous chat before clearing
  }

  chatHistory = [];
  currentChatTitle = null; // Reset title for new chat
  updateChatBox();
  renderHistorySidebar(); // Update sidebar
});

// Add message to history
function addToChatHistory(sender, message) {
  chatHistory.push({ sender, message });

  // Generate title only after the first user message
  if (!currentChatTitle && sender === "user") {
    currentChatTitle = generateChatTitle();
  }

  updateChatBox();
  autoSaveChat();
}

// **Dynamic Title Based on First User Message**
function generateChatTitle() {
  if (chatHistory.length > 0) {
    const firstMessage = chatHistory[0].message;

    // Limit the title to a short, clear description
    const processedTitle = firstMessage.split(" ").slice(0, 5).join(" "); // First 5 words
    return `Topic: ${processedTitle}`;
  }

  // Fallback to timestamp if no messages exist
  const now = new Date();
  return `Chat - ${now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

// Update chat UI
function updateChatBox() {
  chatBox.innerHTML = '';
  chatHistory.forEach(entry => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add(entry.sender);
    messageDiv.textContent = entry.message;
    chatBox.appendChild(messageDiv);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

// **Sidebar & Saved Chats Functionality**
function autoSaveChat() {
  if (!currentChatTitle) {
    currentChatTitle = generateChatTitle(); // Generate title dynamically
  }

  const existingIndex = savedChats.findIndex(chat => chat.title === currentChatTitle);
  const newChat = { title: currentChatTitle, history: [...chatHistory] };

  if (existingIndex !== -1) {
    savedChats[existingIndex] = newChat;
  } else {
    savedChats.push(newChat);
  }

  localStorage.setItem('savedChats', JSON.stringify(savedChats));
  renderHistorySidebar();
}

// Function to manually save a chat
function saveCurrentChat() {
  const title = prompt("Name this chat:");
  if (title) {
    currentChatTitle = title;
    autoSaveChat();
  }
}

// Load saved chats from localStorage on startup
function loadSavedChats() {
  savedChats = JSON.parse(localStorage.getItem('savedChats')) || [];
}

// **Sidebar Rendering with Delete Functionality**
function renderHistorySidebar() {
  historyList.innerHTML = '';

  savedChats.forEach((chat, index) => {
    const li = document.createElement('li');
    li.textContent = chat.title || "Untitled Chat";

    // Create a delete button for each chat
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = "🗑"; // Trash bin emoji for delete
    deleteBtn.style.marginLeft = "10px";
    deleteBtn.style.cursor = "pointer";

    // Attach delete functionality to the button
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent click event from triggering chat selection
      deleteChat(index); // Call deleteChat function with the index
    });

    li.appendChild(deleteBtn);

    // Allow selecting the chat
    li.addEventListener('click', () => {
      chatHistory = [...chat.history];
      currentChatTitle = chat.title;
      updateChatBox();
      historyPanel.classList.remove('active');
    });

    historyList.appendChild(li);
  });
}

// **Delete Chat Function**
function deleteChat(index) {
  // Remove the selected chat from savedChats
  savedChats.splice(index, 1);

  // Save the updated array to localStorage
  localStorage.setItem('savedChats', JSON.stringify(savedChats));

  // Re-render the sidebar
  renderHistorySidebar();
}

// Load saved chats and render sidebar on startup
window.addEventListener('load', () => {
  chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
  loadSavedChats();
  renderHistorySidebar();
  updateChatBox();
});