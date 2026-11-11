/* ==========================================
   L'OREAL AI BEAUTY ADVISOR
   Global Career Accelerator - Project 8
   ========================================== */

// Replace this after deploying your Cloudflare Worker.
// Never put your OpenAI API key in this file.
const WORKER_URL = "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE";

// DOM elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const clearChatBtn = document.getElementById("clearChat");
const latestQuestion = document.getElementById("latestQuestion");
const latestQuestionText = document.getElementById("latestQuestionText");
const promptChips = document.querySelectorAll(".prompt-chip");

// Conversation history - LevelUp (10 points)
// Store only the user and assistant messages.
// The system prompt will be enforced by the Cloudflare Worker.
let conversationHistory = [];
let isLoading = false;

// Keep the conversation within a reasonable size.
const MAX_HISTORY_MESSAGES = 20;

// Add a message bubble to the chat window.
function addMessage(role, content, extraClass = "") {
  const message = document.createElement("div");

  message.className = `msg ${role} ${extraClass}`.trim();
  message.textContent = content;

  chatWindow.appendChild(message);
  scrollToBottom();

  return message;
}

// Scroll to the newest message.
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Remove the welcome screen once chatting begins.
function removeWelcomeMessage() {
  const welcome = chatWindow.querySelector(".welcome-message");

  if (welcome) {
    welcome.remove();
  }
}

// Show the latest user question - LevelUp (5 points).
function updateLatestQuestion(question) {
  latestQuestionText.textContent = question;
  latestQuestion.hidden = false;
}

// Restore the initial welcome screen.
function restoreWelcomeMessage() {
  chatWindow.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-icon">
        <span class="material-icons">spa</span>
      </div>
      <h3>Welcome to Your Beauty Advisor</h3>
      <p>
        I'm here to help you explore L'Oréal beauty
        products and create routines that work for you.
      </p>
      <p class="welcome-question">
        What would you like to discover today?
      </p>
    </div>
  `;
}

// Enable or disable form controls during requests.
function setLoading(loading) {
  isLoading = loading;

  sendBtn.disabled = loading;
  userInput.disabled = loading;

  promptChips.forEach((chip) => {
    chip.disabled = loading;
  });
}

// Send messages to the Cloudflare Worker.
async function getAIResponse(messages) {
  if (
    !WORKER_URL.startsWith("https://") ||
    WORKER_URL.includes("PASTE_YOUR_")
  ) {
    throw new Error(
      "Cloudflare Worker is not configured yet. Add your Worker URL to script.js.",
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
      throw new Error(
        data.error?.message ||
          data.error ||
          "Unable to get a response from the AI service.",
      );
    }

    const answer = data.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("The AI service returned an empty response.");
    }

    return answer.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Handle a new user message.
async function sendMessage(question) {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion || isLoading) {
    return;
  }

  removeWelcomeMessage();

  // LevelUp: display the latest question above the conversation.
  updateLatestQuestion(trimmedQuestion);

  // LevelUp: distinct user message bubble.
  addMessage("user", trimmedQuestion);

  // Add the new question to conversation history.
  conversationHistory.push({
    role: "user",
    content: trimmedQuestion,
  });

  userInput.value = "";
  setLoading(true);

  // Display loading indicator.
  const loadingMessage = addMessage(
    "ai",
    "Finding your beauty recommendations...",
    "loading",
  );

  try {
    const answer = await getAIResponse(conversationHistory);

    loadingMessage.remove();

    // LevelUp: distinct assistant message bubble.
    addMessage("ai", answer);

    // Save the AI answer for future conversational context.
    conversationHistory.push({
      role: "assistant",
      content: answer,
    });

    // Retain the latest 20 messages.
    if (conversationHistory.length > MAX_HISTORY_MESSAGES) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
    }
  } catch (error) {
    loadingMessage.remove();

    let errorMessage = error.message;

    if (error.name === "AbortError") {
      errorMessage = "The request took too long. Please try again.";
    }

    addMessage(
      "error",
      errorMessage || "Something went wrong. Please try again.",
    );

    // Remove failed question from conversation history.
    conversationHistory.pop();
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

// Handle form submissions.
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(userInput.value);
});

// Suggested prompt buttons.
promptChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const question = chip.dataset.prompt;

    if (question) {
      sendMessage(question);
    }
  });
});

// Start a fresh conversation.
clearChatBtn.addEventListener("click", () => {
  if (isLoading) {
    return;
  }

  conversationHistory = [];

  latestQuestion.hidden = true;
  latestQuestionText.textContent = "";

  restoreWelcomeMessage();
  userInput.value = "";
  userInput.focus();
});
