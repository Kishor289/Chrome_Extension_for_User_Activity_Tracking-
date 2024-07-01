document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleButton');
    const heatmapDataContainer = document.getElementById('heatmapContainer');
    const narrativeTextDiv = document.getElementById('summary');
  
    // Initialize the heatmap instance
    const heatmapInstance = h337.create({
      container: heatmapDataContainer,
      radius: 20,
      maxOpacity: 0.6,
      minOpacity: 0,
      blur: 0.75
    });
  
    function updateHeatMapData(data) {
      const dataPoints = [];
      const containerWidth = heatmapDataContainer.clientWidth;
      const containerHeight = heatmapDataContainer.clientHeight;
  
      for (const key in data) {
        const [x, y] = key.split(',').map(Number);
        const value = data[key].value;
        const clicks = data[key].clicks;
  
        dataPoints.push({ x: (x / 400) * containerWidth, y: (y / 400) * containerHeight, value: value + clicks });
      }
  
      heatmapInstance.setData({ max: 100, data: dataPoints });
    }
  
    // Get the current state and update the button text
    chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
      toggleButton.checked = response.isExtensionOn;
    });
  
    // Add click listener to the toggle button
    toggleButton.addEventListener('change', () => {
      chrome.runtime.sendMessage({ type: 'toggleState' }, (response) => {
        toggleButton.checked = response.isExtensionOn;
      });
    });
  
    chrome.runtime.sendMessage({ type: 'requestHeatmapData' }, (response) => {
      if (response.type === 'heatmapData') {
        updateHeatMapData(response.data);
      }
    });
  
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'updateHeatmapData') {
        updateHeatMapData(message.data);
      } else if (message.type === 'narrativeSummary') {
        narrativeTextDiv.textContent = message.text;
      }
    });
  });
  