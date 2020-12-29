var instData = { open: false, tab: null };
chrome.browserAction.setTitle({ title: "No media loaded" });

chrome.runtime.onMessage.addListener((request, sender) => {
    switch (request.method) {
        case "open":
            if (instData.tab == sender.tab.id || instData.tab == null) {
                if (instData.open == false) {
                    chrome.browserAction.setTitle({ title: "Connected to media" });
                    instData.open = true;
                    instData.tab = sender.tab.id;
                }
            }
            break;
        case "closed":
            if (instData.tab == sender.tab.id || instData.tab == null) {
                if (instData.open != false) {
                    chrome.browserAction.setTitle({ title: "No media loaded" });
                    instData.open = false;
                    instData.tab = null;
                }
            }
            break;
        default:
            break;
    }
});
