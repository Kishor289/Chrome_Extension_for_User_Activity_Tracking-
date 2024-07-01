document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleButton');
  const timeSpentElement = document.getElementById('timeSpent');

  let isExtensionOn = false;
  let elapsedTime = 0;
  let timerInterval = null;

  // Get the current state and elapsed time and update the button text
  chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
      isExtensionOn = response.isExtensionOn;
      elapsedTime = response.elapsedTime;
      toggleButton.checked = isExtensionOn;
      updateUI();
      if (isExtensionOn) {
          startTimer();
      }
  });

  // Add change listener to the toggle button
  toggleButton.addEventListener('change', () => {
      chrome.runtime.sendMessage({ type: 'toggleState' }, (response) => {
          isExtensionOn = response.isExtensionOn;
          toggleButton.checked = isExtensionOn;
          updateUI();
          if (isExtensionOn) {
              startTimer();
          } else {
              stopTimer();
          }
      });
  });

  function updateUI() {
      timeSpentElement.textContent = formatTime(elapsedTime);
  }

  function startTimer() {
      if (timerInterval) return;
      timerInterval = setInterval(() => {
          chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
              elapsedTime = response.elapsedTime;
              timeSpentElement.textContent = formatTime(elapsedTime);
          });
      }, 1000);
  }

  function stopTimer() {
      clearInterval(timerInterval);
      timerInterval = null;
  }

  function formatTime(ms) {
      let seconds = Math.floor(ms / 1000);
      const hours = Math.floor(seconds / 3600);
      seconds %= 3600;
      const minutes = Math.floor(seconds / 60);
      seconds %= 60;
      return `${hours}h ${minutes}m ${seconds}s`;
  }
});
