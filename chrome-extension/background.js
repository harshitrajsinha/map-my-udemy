chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveMindMap") {
    // Store the mind map data in Chrome storage
    chrome.storage.local.set({ "mind-map-data": request.data }, async () => {
      // Fetch server URL from config.json
      let configResponse = await fetch(chrome.runtime.getURL("config.json"));
      if (!configResponse.ok) {
        throw new Error("Failed to load configuration");
      }
      const config = await configResponse.json();
      const serverUrl = config.SERVER_URL;

      // Send data to server
      fetch(`${serverUrl}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.data),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Course data sent to server:", data);
          sendResponse({
            success: true,
            message: "Course data saved and sent to server",
          });
        })
        .catch((error) => {
          console.error("Error sending course data to server:", error);
          sendResponse({
            success: true,
            message: "Course data saved locally but failed to send to server",
          });
        });
    });

    return true; // Keep the message channel open for async response
  } else if (request.action === "exportMindMap") {
    // Get the mind map data from storage
    chrome.storage.local.get("mind-map-data", (result) => {
      if (result["mind-map-data"]) {
        // Create a blob and download link
        const blob = new Blob(
          [JSON.stringify(result["mind-map-data"], null, 2)],
          { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mind-map.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "No mind map data found" });
      }
    });

    return true; // Keep the message channel open for async response
  }
});
