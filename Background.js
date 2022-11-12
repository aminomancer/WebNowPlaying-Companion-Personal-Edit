var instData = { open: false, tab: null };
chrome.browserAction.setTitle({ title: "No media loaded" });

chrome.runtime.onMessage.addListener((request, sender) => {
  if (instData.tab !== null && instData.tab !== sender.tab.id) return;
  switch (request.method) {
    case "open":
      if (instData.tab === null) {
        chrome.browserAction.setTitle({ title: "Connected to media" });
        instData.tab = sender.tab.id;
      }
      break;
    case "closed":
      if (instData.tab !== null) {
        chrome.browserAction.setTitle({ title: "No media loaded" });
        instData.tab = null;
      }
      break;
    default:
      break;
  }
});
