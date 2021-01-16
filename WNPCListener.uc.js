function wInit() {
    const options = {
            attributes: true,
            attributeFilter: ["label"],
        },
        observer = new MutationObserver(prefToggle);
    var node = CustomizableUI.getWidget("wnpc_aminomancer-browser-action").forWindow(window).node;

    function xpSet(int) {
        Services.prefs.setIntPref("dom.min_background_timeout_value", int),
            Services.prefs.setIntPref("dom.min_background_timeout_value_without_budget_throttling", int);
    }

    function xpGet() {
        return Services.prefs.getIntPref("dom.min_background_timeout_value");
    }

    function prefToggle(mutationsList) {
        for (let mutation of mutationsList) {
            mutation.target.label === "Connected to media" ? xpGet() == 50 || xpSet(50) : xpGet() == 2000 || xpSet(2000);
        }
    }

    xpSet(2000);
    observer.observe(node, options);
}

if (gBrowserInit.delayedStartupFinished) {
    wInit();
} else {
    let delayedStartupFinished = (subject, topic) => {
        if (topic == "browser-delayed-startup-finished" && subject == window) {
            Services.obs.removeObserver(delayedStartupFinished, topic);
            wInit();
        }
    };
    Services.obs.addObserver(delayedStartupFinished, "browser-delayed-startup-finished");
}
