let state = false;
const heatmapData = {};
let s_text = null;
let lastPosition = null;
let lastMoveTime = null;

function addToHeatMap(x, y, value, click = false) {
  var width = document.documentElement.clientWidth;
  var height = document.documentElement.clientHeight;

  const xKey = Math.floor(((x + window.scrollX) / width) * 400);
  const yKey = Math.floor(((y + window.scrollY) / height) * 400);

  const key = `${xKey},${yKey}`;
  if (!heatmapData[key]) {
    heatmapData[key] = { value: 0, clicks: 0 };
  }
  heatmapData[key].value += value;
  if (click) {
    heatmapData[key].clicks += 10;
  }

  chrome.runtime.sendMessage({ type: 'heatmapData', data: { [key]: heatmapData[key] } });
}

chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
  if (response.isExtensionOn) {
    state = true;
    console.log('Extension is active.');
    act();
  } else {
    state = false;
    console.log('Extension is inactive.');
    act();
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.extensionState) {
    if (changes.extensionState.newValue) {
      state = true;
      console.log('Extension turned on.');
    } else {
      state = false;
      console.log('Extension turned off.');
    }
    act();
  }
});

function act() {
  const links = document.getElementsByTagName('a');
  if (state) {
    document.body.style.backgroundColor = "lightblue";

    document.removeEventListener('click', handleClick);
    document.addEventListener('click', handleClick);

    document.removeEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('selectionchange', handleSelectionChange);

    document.removeEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handleKeyPress);

    document.removeEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousemove', handleMouseMove);

    for (let i = 0; i < links.length; i++) {
      links[i].removeEventListener('click', trackLinkClick);
      links[i].addEventListener('click', trackLinkClick);
    }
  } else {
    document.body.style.backgroundColor = "transparent";

    document.removeEventListener('click', handleClick);
    document.removeEventListener('selectionchange', handleSelectionChange);
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('mousemove', handleMouseMove);
    for (let i = 0; i < links.length; i++) {
      links[i].removeEventListener('click', trackLinkClick);
    }
  }
}

function trackLinkClick(event) {
  const linkInfo = {
    url: event.target.href
  };
  chrome.runtime.sendMessage({ type: 'linkINFO', data: linkInfo });
}

function handleClick(event) {
  const clickInfo = {
    text: event.target.innerText || event.target.alt || "No text available",
    tag: event.target.tagName
  };

  addToHeatMap(event.clientX, event.clientY, 0, true);

  if (s_text) {
    clearTimeout(selectionTimeout);
    chrome.runtime.sendMessage({ type: 'selectedText', data: s_text });
    s_text = null;
  }
  chrome.runtime.sendMessage({ type: 'click', data: clickInfo });
}

function handleSelectionChange() {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const selectedText = selection.toString();
    if (selectedText) {
      s_text = selectedText;

      selectionTimeout = setTimeout(() => {
        if (s_text) {
          chrome.runtime.sendMessage({ type: 'selectedText', data: s_text });
          s_text = null;
        }
      }, 2000);
    }
  }
}

function handleKeyPress(event) {
  const keyInfo = {
    type: 'keydown',
    key: event.key,
    code: event.code,
    tag: event.target.tagName,
    id: event.target.id,
    classes: event.target.className
  };

  chrome.runtime.sendMessage({ type: 'key', data: keyInfo });
}

function handleMouseMove(event) {
  const currentTime = Date.now();
  const currentPosition = { x: event.clientX, y: event.clientY };

  if (lastPosition) {
    const timeSpent = currentTime - lastMoveTime;
    addToHeatMap(lastPosition.x, lastPosition.y, timeSpent / 100);
  }

  lastPosition = currentPosition;
  lastMoveTime = currentTime;
}
