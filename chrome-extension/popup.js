document.addEventListener("DOMContentLoaded", function () {
  const checkButton = document.getElementById("checkButton");
  const screenshotButton = document.getElementById("screenshotButton");
  const resultDiv = document.getElementById("result");
  let mindMapGenerated = false;

  // Function to get course information from the page
  async function getCourseInfo() {
    try {
      // First wait for all sections to be expanded
      const curriculumElement = document.querySelector(
        '[data-purpose="course-curriculum"]'
      );
      if (!curriculumElement) {
        return null;
      }

      // Ensure curriculum is expanded
      const expandButton = curriculumElement.querySelector(
        '[data-purpose="expand-toggle"]'
      );
      if (
        expandButton &&
        expandButton.getAttribute("aria-expanded") === "false"
      ) {
        expandButton.click();
        // Wait for the content to be fully expanded
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const isExpanded =
              expandButton.getAttribute("aria-expanded") === "true";
            if (isExpanded) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          // Maximum wait time of 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 5000);
        });
      }

      // Get course name
      const titleElement = document.querySelector(
        '[data-purpose="lead-title"]'
      );
      const courseName = titleElement ? titleElement.textContent.trim() : null;

      // Get instructor name
      const instructorElement = document.querySelector(
        ".ud-instructor-links span"
      );
      const instructorName = instructorElement
        ? instructorElement.textContent.trim()
        : null;

      // Get course sections and their items
      const sections = [];
      const panelContainer = curriculumElement.querySelector(
        "div:not([class]):not([id]):not([name]):not([style])"
      );
      if (!panelContainer) {
        return null;
      }

      // Find all accordion panels
      const panels = panelContainer.querySelectorAll(
        ".accordion-panel-module--panel--Eb0it.section--panel--qYPjj"
      );

      // Process each panel
      panels.forEach((panel) => {
        // Get section title
        const sectionTitle = panel.querySelector(
          ".ud-accordion-panel-heading .section--section-title--svpHP"
        );
        if (!sectionTitle) return;

        // Get section items
        const sectionList = panel.querySelector("ul.ud-unstyled-list");
        const sectionItems = [];

        if (sectionList) {
          // Get all list items
          const items = sectionList.querySelectorAll("li");
          items.forEach((item) => {
            const itemDiv = item.querySelector(".section--row--MuPRa");
            if (itemDiv) {
              const itemText = itemDiv.querySelector("span");
              if (itemText) {
                sectionItems.push(itemText.textContent.trim());
              }
            }
          });
        }

        // Add section to sections array
        sections.push({
          "section-heading": sectionTitle.textContent.trim(),
          "section-items": sectionItems,
        });
      });

      // Create course info object
      if (sections.length === 0) {
        return null;
      }

      return {
        course: courseName || "Not found",
        instructor: instructorName || "Not found",
        "section-content": sections,
      };
    } catch (error) {
      console.error("Error getting course info:", error);
      return null;
    }
  }

  // Function to store course information in storage
  function storeCourseInfo(courseInfo) {
    try {
      chrome.storage.local.set({ "udemy-course": courseInfo }, function () {
        console.log("Course info stored successfully");
      });
    } catch (error) {
      console.error("Error storing course info:", error);
    }
  }

  // Handle Generate Mind Map button
  checkButton.addEventListener("click", async function () {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url) {
      showResult("No active tab found", "error");
      setTimeout(() => {
        showResult("");
      }, 2000);
      return;
    }

    try {
      // Fetch server URL from config.json
      let configResponse = await fetch(chrome.runtime.getURL("config.json"));
      if (!configResponse.ok) {
        throw new Error("Failed to load configuration");
      }
      const config = await configResponse.json();
      const serverUrl = config.SERVER_URL;

      // First check if it's a Udemy course URL
      const parsedUrl = new URL(tab.url);
      if (
        parsedUrl.hostname !== "www.udemy.com" ||
        !parsedUrl.pathname.startsWith("/course/")
      ) {
        showResult("This is not a Udemy course URL", "error");
        setTimeout(() => {
          showResult("");
        }, 2000);
        return;
      }

      // Execute the content script to get course information
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getCourseInfo,
      });

      if (result?.result) {
        const { course, instructor } = result.result;
        // Store the course info
        storeCourseInfo(result.result);

        // Send data to server
        fetch(`${serverUrl}/courses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(result.result),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log("Course data sent to server:", data);
            if (data.success) {
              showResult("Mind map generated successfully!", "success");
              setTimeout(() => {
                showResult("");
              }, 2000);
              mindMapGenerated = true;
              screenshotButton.disabled = false;
              screenshotButton.onclick = () => {
                // Open screenshot page with course data
                chrome.tabs.create({
                  url: data.screenshotUrl,
                });
              };
            } else {
              showResult("Failed to generate mind map", "error");
              setTimeout(() => {
                showResult("");
              }, 2000);
            }
          })
          .catch((error) => {
            console.error("Error sending course data to server:", error);
            showResult("Failed to generate mind map", "error");
            setTimeout(() => {
              showResult("");
            }, 2000);
          });
      } else {
        showResult("Course not found", "error");
        setTimeout(() => {
          showResult("");
        }, 2000);
      }
    } catch (error) {
      console.error("Error:", error);
      showResult(
        "Error checking course. Please make sure you are on a Udemy course page.",
        "error"
      );
      setTimeout(() => {
        showResult("");
      }, 2000);
    }
  });

  function showResult(message, type) {
    resultDiv.className = `result ${type}`;
    resultDiv.textContent = message;
  }
});
