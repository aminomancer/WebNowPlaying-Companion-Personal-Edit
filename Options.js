const options = {
  doGeneric: false,
  useGenericList: false,
  whitelistOrBlacklist: "whitelist",
  genericList: ["streamable.com", "www.adultswim.com"],
  useChapters: false,
};

function updateOptions() {
  options.doGeneric = document.getElementById("generic").checked;
  options.useGenericList = document.getElementById("useGenericList").checked;
  options.whitelistOrBlacklist = document.getElementById("listType").value;
  options.genericList = document
    .getElementById("genericList")
    .value.split("\n");
  options.useChapters = document.getElementById("useChapters").checked;
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(options, function(items) {
    document.getElementById("generic").checked = items.doGeneric;
    document.getElementById("useGenericList").checked = items.useGenericList;
    document.getElementById("listType").value = items.whitelistOrBlacklist;
    document.getElementById("genericList").value = items.genericList.join("\n");
    document.getElementById("useChapters").checked = items.useChapters;

    updateOptions();
  });
}

function maybeSaveOptions() {
  let isChanged =
    options.doGeneric != document.getElementById("generic").checked ||
    options.useGenericList !=
      document.getElementById("useGenericList").checked ||
    options.whitelistOrBlacklist != document.getElementById("listType").value ||
    options.genericList.toString() !=
      document
        .getElementById("genericList")
        .value.split("\n")
        .toString() ||
    options.useChapters != document.getElementById("useChapters").checked;
  if (isChanged) {
    updateOptions();
    chrome.storage.sync.set(options);
  }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("input", maybeSaveOptions);
window.onbeforeunload = function(e) {
  updateOptions();
  chrome.storage.sync.set(options);
};
