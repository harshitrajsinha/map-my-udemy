const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = "/";
const DATA_FILE = path.join(DATA_DIR, "temp-screenshot.html");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Map My Udemy API" });
});

// Serve static files
app.use(express.static("public"));

// Serve the HTML file through Express
app.get("/screenshot", (req, res) => {
  const tempHtmlPath = path.join(__dirname, "temp-screenshot.html");
  console.log(
    `[${new Date().toISOString()}] [INFO] GET /screenshot - Serving screenshot page`
  );
  res.sendFile(tempHtmlPath);
});

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

// Save course data from extension and generate screenshot
app.post("/courses", async (req, res) => {
  try {
    const { course, instructor, "section-content": sections } = req.body;

    if (!course || !instructor || !sections) {
      console.log(
        `[${new Date().toISOString()}] [ERROR] POST /courses - Error: Missing required fields`
      );
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create course data object
    const courseData = {
      course,
      instructor,
      "section-content": sections,
    };

    // Convert to jsMind format
    const jsMindData = convertToJsMindFormat(courseData);

    // Write data (replacing existing data)
    await fs.writeFile(DATA_FILE, JSON.stringify(jsMindData, null, 2));

    // Create temporary HTML file with jsMind
    const tempHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Mind Map</title>
                <script src="https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js"></script>
                <link type="text/css" rel="stylesheet" href="//cdn.jsdelivr.net/npm/jsmind@0.8.1/style/jsmind.css" />
                <script src="//cdn.jsdelivr.net/npm/jsmind@0.8.1/es6/jsmind.js"></script>
                <script src="//cdn.jsdelivr.net/npm/jsmind@0.8.1/es6/jsmind.draggable-node.js"></script>
                <script src="//cdn.jsdelivr.net/npm/jsmind@0.8.1/es6/jsmind.screenshot.js"></script>
                <style>
                    #jsmind_container {
                        width: 100%;
                        height: 100vh;
                        border: 0;
                        background: #ffffff;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <div id="jsmind_container"></div>
                <script>
                    // Wait for jsMind to be loaded
                    function initMindMap() {
                        console.log('Checking if jsMind is loaded...');
                        if (typeof jsMind === 'undefined') {
                            console.log('jsMind not yet loaded, retrying...');
                            setTimeout(initMindMap, 100);
                            return;
                        }
                        
                        console.log('jsMind loaded, initializing...');
                        var options = {
                            container: 'jsmind_container',
                            editable: false,
                            theme: 'greensea',
                            support_html: false,
                            view: {
                                enable_device_pixel_ratio: true
                            },
                            plugin: {
                                screenshot: {
                                    watermark: {
                                        left: "",
                                        right: "map-my-udemy"
                                    }
                                }
                            }
                        };
                        var jm = new jsMind(options);
                        jm.init();
                        jm.show(${JSON.stringify(jsMindData)});
                        
                        // Wait for mind map to render and take screenshot
                        setTimeout(function() {
                            console.log('Mind map rendered');
                            // Add a button to take screenshot manually
                            const button = document.createElement('button');
                            button.textContent = 'Take Screenshot';
                            button.style.position = 'absolute';
                            button.style.top = '10px';
                            button.style.right = '10px';
                            button.style.zIndex = '1000';
                            button.onclick = function() {
                                console.log('Taking screenshot...');
                                jm.shoot();
                            };
                            document.body.appendChild(button);
                        }, 500);
                    }
                    
                    // Start initialization
                    initMindMap();
                </script>
            </body>
            </html>
        `;

    // Write temporary HTML file
    const tempHtmlPath = path.join(__dirname, "temp-screenshot.html");
    console.log(
      `[${new Date().toISOString()}] [INFO] POST /courses - Writing temporary HTML file to: ${tempHtmlPath}`
    );
    await fs.writeFile(tempHtmlPath, tempHtml);

    // Open in browser
    console.log(
      `[${new Date().toISOString()}] [INFO] POST /courses - Opening HTML file in browser`
    );
    const { exec } = require("child_process");
    exec(`start http://localhost:${PORT}/screenshot`);

    // Add a small delay before responding to ensure the file is written
    setTimeout(() => {
      console.log(
        `[${new Date().toISOString()}] [INFO] POST /courses - Successfully saved course: ${course}`
      );
      console.log(
        `[${new Date().toISOString()}] [INFO] POST /courses - Screenshot generation triggered`
      );
      res.status(201).json(jsMindData);
    }, 500);
  } catch (error) {
    console.log(
      `[${new Date().toISOString()}] [ERROR] POST /courses - Error: ${
        error.message
      }`
    );
    res.status(500).json({ error: "Error saving course" });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(
    `[${new Date().toISOString()}] [INFO] Server is running on port ${PORT}`
  );
});
