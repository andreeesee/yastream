// Install
function setInstallUrl(url) {
  const webLink = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(url)}`;
  const stremioAppLink = url
    .replace("https://", "stremio://")
    .replace("http://", "stremio://");
  // Set up install links
  document.getElementById("installApp").href = stremioAppLink;
  document.getElementById("installWeb").href = webLink;
  document.getElementById("manifestUrl").textContent = url;
}

// Copy URL function
function copyUrl() {
  const manifestUrl = document.getElementById("manifestUrl").textContent;
  navigator.clipboard
    .writeText(manifestUrl)
    .then(() => {
      const btn = document.querySelector(".copy-btn");
      const originalText = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    })
    .catch((err) => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = manifestUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      const btn = document.querySelector(".copy-btn");
      const originalText = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
}

// Changelog
const modal = document.getElementById("changelogModal");
const versionBtn = document.getElementById("versionTag");
const closeBtn = document.querySelector(".close-modal");

// Open modal on click
versionBtn.onclick = function () {
  modal.style.display = "block";
};

// Close modal when clicking (X)
closeBtn.onclick = function () {
  modal.style.display = "none";
};

// Close modal when clicking anywhere outside the box
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

// Catalog selection
function newTomSelect(selector) {
  return new TomSelect(selector, {
    plugins: {
      remove_button: {
        title: "Remove this catalog",
      },
    },
    hideSelected: true,
  });
}
const kisskhSelect = newTomSelect("#kisskh-catalog");
const onetouchtvSelect = newTomSelect("#onetouchtv-catalog");

function getTomSelect(catalog) {
  switch (catalog) {
    case "kisskh":
      return kisskhSelect;
    case "onetouchtv":
      return onetouchtvSelect;
    default:
      return null;
  }
}
const catalogs = ["kisskh", "onetouchtv"];
function updateCatalogs() {
  catalogs.forEach((catalog) => {
    const catalogs = document.getElementById(`${catalog}-catalog`);
    const providerCatalog = document.getElementById(`catalog.${catalog}`);
    const tomSelect = getTomSelect(catalog);
    if (providerCatalog.checked === true) {
      catalogs.nextSibling.style.display = "block";
    } else {
      catalogs.nextSibling.style.display = "none";
      tomSelect.clear();
    }
  });
}

// Configure
document
  .getElementById("configureForm")
  .addEventListener("change", function (e) {
    e.preventDefault();
    updateManifestUrl();
  });

function updateManifestUrl() {
  const config = {
    catalogs: [],
    catalog: [],
    stream: [],
  };

  updateCatalogs();
  let selectedCatalogs = [];
  catalogs.forEach((catalog) => {
    const tomSelect = getTomSelect(catalog);
    selectedCatalogs = selectedCatalogs.concat(tomSelect.getValue());
  });
  config.catalogs = Array.from(selectedCatalogs);
  console.log("Selected catalogs:", config.catalogs);
  const defaultCatalogs = [
    "kisskh.series.Search",
    "kisskh.movie.Search",
    "onetouchtv.series.Search",
    "idrama.series.Search",
    "idrama.series.iDrama",
  ];
  config.catalogs = [...config.catalogs, ...defaultCatalogs];
  console.log("Final catalogs list:", config.catalogs);
  const checkedBoxes = document.querySelectorAll(
    '#configureForm input[type="checkbox"]',
  );
  checkedBoxes.forEach((box) => {
    if (!box.id.includes(".")) {
      // for nsfw, info
      config[box.id] = box.checked;
    } else if (box.checked == true) {
      // for catalog and stream provider
      const [type, source] = box.id.split(".");
      if (config[type]) {
        config[type].push(source);
      }
    }
  });

  console.log("[config]", config);
  const configJson = JSON.stringify(config);
  const configBase64 = btoa(configJson);
  const manifestUrl =
    window.location.origin + "/" + configBase64 + "/manifest.json";
  setInstallUrl(manifestUrl);
}

// Update config redirect from stremio (/config64/configure)
document.addEventListener("DOMContentLoaded", () => {
  setInstallUrl(window.location.origin + "/manifest.json");
  const path = window.location.pathname;
  const match = path.match(/\/(.+)\/configure/);
  if (match && match[1]) {
    try {
      const config = JSON.parse(atob(match[1]));
      console.log(JSON.stringify(config));

      Object.keys(config).forEach((key) => {
        const values = config[key];
        if (key === "nsfw" || key === "info") {
          const input = document.getElementById(key);
          input.checked = config[key];
        } else if (key === "catalogs") {
          catalogs.forEach((catalog) => {
            const tomSelect = getTomSelect(catalog);
            const catalogValues = values.filter((value) =>
              value.startsWith(catalog),
            );
            tomSelect.setValue(catalogValues);
          });
        } else if (key === "catalog" || key === "stream") {
          values.forEach((value) => {
            // Reconstruct the ID (e.g., "catalog.idrama")
            const inputId = `${key}.${value}`;
            const input = document.getElementById(inputId);
            if (input) {
              input.checked = true;
            }
          });
        }
      });

      // After applying saved config, update the install links
      updateManifestUrl();
    } catch (error) {
      console.error("Failed to decode configuration:", error);
    }
  } else {
    updateManifestUrl();
  }
});
