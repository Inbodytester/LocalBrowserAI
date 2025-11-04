document.addEventListener("DOMContentLoaded", () => {
  const sendButton = document.getElementById("sendButton");
  const promptInput = document.getElementById("prompt");
  const statusDiv = document.getElementById("status");
  const responseDiv = document.getElementById("response");

  sendButton.addEventListener("click", () => {
    statusDiv.textContent = "Taking screenshot...";
    responseDiv.textContent = "";

    // 1. Capture the visible tab
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (!dataUrl) {
        statusDiv.textContent = "Error: Could not take screenshot.";
        return;
      }

      // dataUrl is "data:image/png;base64,iVBORw0KGgo..."
      // We need to strip the prefix to get only the base64 data
      const base64Image = dataUrl.split(',')[1];
      const userPrompt = promptInput.value;

      statusDiv.textContent = "Sending to LM Studio...";

      // 2. Send data to the Python backend
      fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userPrompt,
          image: base64Image,
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.response) {
          statusDiv.textContent = "Response received:";
          responseDiv.textContent = data.response;
        } else {
          statusDiv.textContent = "Error: No response from server.";
        }
      })
      .catch(error => {
        console.error("Error:", error);
        statusDiv.textContent = "Error: Could not connect to backend. Is it running?";
      });
    });
  });
});
