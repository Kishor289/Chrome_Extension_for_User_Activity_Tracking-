let isExtensionOn = false;
let clicks = [];
let selectedTexts = [];
let keys = [];
let link_data = [];
let combinedHeatmapData = {};
let startTime = null;
let elapsedTime = 0;
let timerInterval = null;
let narrativeInterval = null;
const COHERE_API_KEY = 'YOUR_COHERE_API_KEY'; // Add your Cohere API key here

// Load the initial state from storage
chrome.storage.sync.get(['extensionState', 'startTime', 'elapsedTime'], (result) => {
  if (result.extensionState !== undefined) {
    isExtensionOn = result.extensionState;
  } else {
    chrome.storage.sync.set({ extensionState: isExtensionOn });
  }

  if (isExtensionOn) {
    startTimer();
    startNarrativeInterval();
  }
});

// Listen for changes in the extension state
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.extensionState) {
    isExtensionOn = changes.extensionState.newValue;
    if (isExtensionOn) {
      startTimer();
      startNarrativeInterval();
    } else {
      stopTimer();
      stopNarrativeInterval();
    }
  }
});

function startTimer() {
  if (!startTime) {
    startTime = new Date().getTime();
    chrome.storage.local.set({ startTime });
  }
  timerInterval = setInterval(() => {
    const currentTime = new Date().getTime();
    elapsedTime = currentTime - startTime;
    chrome.storage.local.set({ elapsedTime });
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  chrome.storage.sync.set({ elapsedTime, startTime: null });
}

function startNarrativeInterval() {
  narrativeInterval = setInterval(() => {
    generateNarrativeSummary();
  }, 5000);
}

function stopNarrativeInterval() {
  clearInterval(narrativeInterval);
  narrativeInterval = null;
}

// Function to handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getState') {
    sendResponse({ isExtensionOn, elapsedTime });
  } else if (message.type === 'toggleState') {
    isExtensionOn = !isExtensionOn;
    chrome.storage.sync.set({ extensionState: isExtensionOn });
    sendResponse({ isExtensionOn });
    if (isExtensionOn) {
      startTimer();
      startNarrativeInterval();
    } else {
      stopTimer();
      stopNarrativeInterval();
    }
  } else if (message.type === 'click') {
    clicks.push(message.data);
    console.log('Click recorded:', message.data);

    
    chrome.storage.local.set({ clicks });

  } else if (message.type === 'selectedText') {
    selectedTexts.push(message.data);
    console.log('Selected text recorded:', message.data);

    
    chrome.storage.local.set({ selectedTexts });
  } else if (message.type === 'key') {
    keys.push(message.data);
    console.log('Key data:', message.data);

    
    chrome.storage.local.set({ keys });
  } else if (message.type === 'heatmapData') {
    const data = message.data;
    for (const key in data) {
      if (!combinedHeatmapData[key]) {
        combinedHeatmapData[key] = { value: 0, clicks: 0 };
      }
      combinedHeatmapData[key].value += data[key].value;
      combinedHeatmapData[key].clicks += data[key].clicks;
    }

    chrome.runtime.sendMessage({ type: 'updateHeatmapData', data: combinedHeatmapData });
  } else if (message.type === 'requestHeatmapData') {
    sendResponse({ type: 'heatmapData', data: combinedHeatmapData });

  } else if (message.type === 'linkINFO') {
    link_data.push(message.data);
    console.log('link data:', message.data);

    chrome.storage.local.set({ link_data });
  }
});

async function generateNarrativeSummary() {
  let currentTabUrl = '';

  // Get the current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      currentTabUrl = tab.url;
    }
  } catch (error) {
    console.error('Error getting current tab URL:', error);
  }

  const prompt = `
    The user has performed the following actions:
    - Clicks: ${JSON.stringify(clicks)}
    - Selected Text: ${JSON.stringify(selectedTexts)}
    - Keystrokes: ${JSON.stringify(keys)}
    - Time Spent: ${elapsedTime / 1000} seconds
    - Clicked hyperlinks: ${JSON.stringify(link_data)}
    - Current webpage URL: ${currentTabUrl}

    Based on these actions, provide a narrative summary of what the user is probably reading or doing.
  `;

  try {
    const response = await fetch('https://api.cohere.ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'command-xlarge-nightly',
        prompt: prompt,
        max_tokens: 150
      })
    });
    const data = await response.json();
    const narrativeSummary = data.generations[0].text;

    // Send the narrative summary to the sidepanel
    chrome.runtime.sendMessage({ type: 'narrativeSummary', text: narrativeSummary });
  } catch (error) {
    console.error('Error generating narrative summary:', error);
  }
}
