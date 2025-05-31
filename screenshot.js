// Wait for jsMind to be loaded
function initMindMap() {
  console.log("Checking if jsMind is loaded...");
  if (typeof jsMind === "undefined") {
    console.log("jsMind not yet loaded, retrying...");
    setTimeout(initMindMap, 100);
    return;
  }

  console.log("jsMind loaded, initializing...");
  var options = {
    container: "jsmind_container",
    editable: false,
    theme: "greensea",
    support_html: false,
    view: {
      enable_device_pixel_ratio: true,
    },
    plugin: {
      screenshot: {
        watermark: {
          left: "",
          right: "map-my-udemy",
        },
      },
    },
  };

  const courseMap = JSON.parse(localStorage.getItem("udemy-course-map"));
  var jm = new jsMind(options);
  jm.init();
  jm.show(courseMap);

  // Add container for buttons
  const BtnsContainer = document.createElement("div");
  BtnsContainer.style.position = "absolute";
  BtnsContainer.style.top = "0.5rem";
  BtnsContainer.style.right = "25px";
  BtnsContainer.style.width = "10rem";
  BtnsContainer.style.height = "12rem";
  BtnsContainer.style.backgroundColor = "aliceblue";
  BtnsContainer.style.zIndex = "500";
  document.body.appendChild(BtnsContainer);

  // Add a button to take screenshot manually
  const SrshButton = document.createElement("button");
  SrshButton.textContent = "Take Screenshot";
  SrshButton.style.position = "absolute";
  SrshButton.style.top = "1rem";
  SrshButton.style.right = "15px";
  SrshButton.style.zIndex = "1000";
  SrshButton.onclick = function () {
    console.log("Taking screenshot...");
    jm.expand_all();
    jm.shoot();
  };
  BtnsContainer.appendChild(SrshButton);

  // Add a button to expand all nodes manually
  const ExpButton = document.createElement("button");
  ExpButton.textContent = "Expand All";
  ExpButton.style.position = "absolute";
  ExpButton.style.top = "3rem";
  ExpButton.style.right = "15px";
  ExpButton.style.zIndex = "1000";
  ExpButton.onclick = function () {
    console.log("Expanding All...");
    jm.expand_all();
  };
  BtnsContainer.appendChild(ExpButton);

  // Add a button to collapse all nodes manually
  const ClsButton = document.createElement("button");
  ClsButton.textContent = "Collapse All";
  ClsButton.style.position = "absolute";
  ClsButton.style.top = "5rem";
  ClsButton.style.right = "15px";
  ClsButton.style.zIndex = "1000";
  ClsButton.onclick = function () {
    console.log("Collapsing All...");
    jm.collapse_all();
  };
  BtnsContainer.appendChild(ClsButton);

  // Add a button to zoom in manually
  const zoomInButton = document.createElement("button");
  zoomInButton.textContent = "Zoom In";
  zoomInButton.id = "zoom-in-button";
  zoomInButton.style.position = "absolute";
  zoomInButton.style.top = "7rem";
  zoomInButton.style.right = "15px";
  zoomInButton.style.zIndex = "1000";
  zoomInButton.onclick = function () {
    zoomIn();
  };
  BtnsContainer.appendChild(zoomInButton);

  // Add a button to zoom out manually
  const zoomOutButton = document.createElement("button");
  zoomOutButton.textContent = "Zoom Out";
  zoomInButton.id = "zoom-out-button";
  zoomOutButton.style.position = "absolute";
  zoomOutButton.style.top = "9rem";
  zoomOutButton.style.right = "15px";
  zoomOutButton.style.zIndex = "1000";
  zoomOutButton.onclick = function () {
    zoomOut();
  };
  BtnsContainer.appendChild(zoomOutButton);

  // Zoom in and Zoom out functionality
  const zoomInButtonElem = document.getElementById("zoom-in-button");
  const zoomOutButtonElem = document.getElementById("zoom-out-button");

  function zoomIn() {
    jm.view.zoom_in();
    // if (jm.view.zoom_in()) {
    //     zoomOutButtonElem.disabled = false;
    // } else {
    //     zoomInButtonElem.disabled = true;
    // }
  }

  function zoomOut() {
    jm.view.zoom_out();
    // if (jm.view.zoom_out()) {
    //     zoomInButtonElem.disabled = false;
    // } else {
    //     zoomOutButtonElem.disabled = true;
    // }
  }

  // Wait for mind map to render and take screenshot
  setTimeout(function () {
    console.log("Mind map rendered");
  }, 500);
}

// Start initialization
initMindMap();
