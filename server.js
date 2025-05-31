const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_SERVER = process.env.BACKEND_SERVER || "http://locahost";
const DATA_DIR = "./";
const DATA_FILE = path.join(DATA_DIR, "temp-screenshot.html");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve static files
app.use(express.static("public"));

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

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Map My Udemy API" });
});

// Serve the HTML file through Express
app.get("/screenshot", (req, res) => {
  const tempHtmlPath = path.join(__dirname, "temp-screenshot.html");
  console.log(
    `[${new Date().toISOString()}] [INFO] GET /screenshot - Serving screenshot page`
  );
  res.sendFile(tempHtmlPath);
});

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
                <title>Map My Udemy</title>
                <script src="https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js"></script>
                <link type="text/css" rel="stylesheet" href="//cdn.jsdelivr.net/npm/jsmind@0.8.1/style/jsmind.css" />
                <script src="//cdn.jsdelivr.net/npm/jsmind@0.8.1/es6/jsmind.js"></script>
                <script src="//cdn.jsdelivr.net/npm/jsmind@0.8.1/es6/jsmind.draggable-node.js"></script>
                <script src="//cdn.jsdelivr.net/npm/jsmind@0.8.1/es6/jsmind.screenshot.js"></script>
                <style>
                    jmnode{
                      max-width: fit-content;
                    }
                      jmnodes.theme-greensea jmnode.selected {
                        background-color: #1abc9c;
                        color: #fff;
                    }
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

                        // Add container for buttons
                        const BtnsContainer = document.createElement('div');
                        BtnsContainer.style.position = 'absolute';
                        BtnsContainer.style.top = '0.5rem';
                        BtnsContainer.style.right = '25px';
                        BtnsContainer.style.width = '10rem';
                        BtnsContainer.style.height = '12rem';
                        BtnsContainer.style.backgroundColor = 'aliceblue';
                        BtnsContainer.style.zIndex = '500';
                        document.body.appendChild(BtnsContainer);


                        // Add a button to take screenshot manually
                        const SrshButton = document.createElement('button');
                        SrshButton.textContent = 'Take Screenshot';
                        SrshButton.style.position = 'absolute';
                        SrshButton.style.top = '1rem';
                        SrshButton.style.right = '15px';
                        SrshButton.style.zIndex = '1000';
                        SrshButton.onclick = function() {
                            console.log('Taking screenshot...');
                            jm.expand_all();
                            jm.shoot();
                        };
                        BtnsContainer.appendChild(SrshButton);

                        // Add a button to expand all nodes manually
                        const ExpButton = document.createElement('button');
                        ExpButton.textContent = 'Expand All';
                        ExpButton.style.position = 'absolute';
                        ExpButton.style.top = '3rem';
                        ExpButton.style.right = '15px';
                        ExpButton.style.zIndex = '1000';
                        ExpButton.onclick = function() {
                            console.log('Expanding All...');
                            jm.expand_all();
                        };
                        BtnsContainer.appendChild(ExpButton);

                        // Add a button to collapse all nodes manually
                        const ClsButton = document.createElement('button');
                        ClsButton.textContent = 'Collapse All';
                        ClsButton.style.position = 'absolute';
                        ClsButton.style.top = '5rem';
                        ClsButton.style.right = '15px';
                        ClsButton.style.zIndex = '1000';
                        ClsButton.onclick = function() {
                            console.log('Collapsing All...');
                            jm.collapse_all();
                        };
                        BtnsContainer.appendChild(ClsButton);

                        // Add a button to zoom in manually
                        const zoomInButton = document.createElement('button');
                        zoomInButton.textContent = 'Zoom In';
                        zoomInButton.id = 'zoom-in-button';
                        zoomInButton.style.position = 'absolute';
                        zoomInButton.style.top = '7rem';
                        zoomInButton.style.right = '15px';
                        zoomInButton.style.zIndex = '1000';
                        zoomInButton.onclick = function() {
                            zoomIn()
                        };
                        BtnsContainer.appendChild(zoomInButton);

                        // Add a button to zoom out manually
                        const zoomOutButton = document.createElement('button');
                        zoomOutButton.textContent = 'Zoom Out';
                        zoomInButton.id = 'zoom-out-button';
                        zoomOutButton.style.position = 'absolute';
                        zoomOutButton.style.top = '9rem';
                        zoomOutButton.style.right = '15px';
                        zoomOutButton.style.zIndex = '1000';
                        zoomOutButton.onclick = function() {
                            zoomOut()
                        };
                        BtnsContainer.appendChild(zoomOutButton);

                        // Zoom in and Zoom out functionality
                        const zoomInButtonElem = document.getElementById('zoom-in-button');
                        const zoomOutButtonElem = document.getElementById('zoom-out-button');

                        function zoomIn() {
                          jm.view.zoom_in()
                            // if (jm.view.zoom_in()) {
                            //     zoomOutButtonElem.disabled = false;
                            // } else {
                            //     zoomInButtonElem.disabled = true;
                            // }
                        }

                        function zoomOut() {
                          jm.view.zoom_out()
                            // if (jm.view.zoom_out()) {
                            //     zoomInButtonElem.disabled = false;
                            // } else {
                            //     zoomOutButtonElem.disabled = true;
                            // }
                        }
                        
                        // Wait for mind map to render and take screenshot
                        setTimeout(function() {
                            console.log('Mind map rendered');
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
    exec(`start ${BACKEND_SERVER}:${PORT}/screenshot`);

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
