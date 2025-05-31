document.addEventListener("DOMContentLoaded", function () {
  const generateMindMapBtn = document.getElementById("generate");
  const resultDiv = document.getElementById("result");

  // Helper function to generate random alphanumeric ID
  function generateRandomId() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 4; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

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

  // Convert course data to jsMind format
  function convertToJsMindFormat(courseData) {
    const rootId = "root";

    // Convert sections to jsMind format with index numbers
    const children = courseData["section-content"].map(
      (section, sectionIndex) => {
        const sectionId = generateRandomId();
        const sectionNumber = sectionIndex + 1;
        const sectionHeading = `${sectionNumber}. ${section["section-heading"]}`;

        return {
          id: sectionId,
          topic: sectionHeading,
          expanded: true,
          direction: "right",
          children: section["section-items"].map((item, itemIndex) => {
            const itemNumber = itemIndex + 1;
            return {
              id: generateRandomId(),
              topic: `${sectionNumber}.${itemNumber}. ${item}`,
              expanded: true,
            };
          }),
        };
      }
    );

    return {
      meta: {
        author: "map-my-udemy",
        version: "0.1",
      },
      format: "node_tree",
      data: {
        id: rootId,
        topic: courseData.course,
        expanded: true,
        children,
      },
    };
  }

  // Handle Generate Mind Map button
  generateMindMapBtn.addEventListener("click", async function () {
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
        const {
          course,
          instructor,
          "section-content": sections,
        } = result.result;

        if (!course || !instructor || !sections) {
          console.log(
            `Error: Missing required fields: course || instructor || sections`
          );
        }

        // Create course data object
        const courseData = {
          course,
          instructor,
          "section-content": sections,
        };

        // Convert to jsMind format
        const jsMindData = convertToJsMindFormat(courseData);

        localStorage.setItem("udemy-course-map", JSON.stringify(jsMindData));

        showResult("Mind map generated successfully!", "success");
        setTimeout(() => {
          showResult("");
        }, 2000);

        window.open("/screenshot.html", "_blank");
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
