// Adds support for the new youtube layout
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize*/

var lastImgVideoID = "";
var lastAlbumVideoID = "";
var currImg = "";
var currCategory = "";
var wasMadeVisable = false;

// A fallback in case the video's time display isn't working.
function fancyTimeFormat(dur) {
  // Hours, minutes and seconds
  let days = ~~(dur / 86400);
  let hrs = ~~((dur % 86400) / 3600);
  let mins = ~~((dur % 3600) / 60);
  let secs = ~~dur % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  let ret = "";
  if (days > 0) ret += "" + days + ":" + (hrs < 10 ? "0" : "");
  if (hrs > 0) ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  if (mins > 0) ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  else ret += "" + 0 + ":";
  ret += "" + secs;
  return ret;
}

function isMiniPlayerActive() {
  return document.querySelector("ytd-miniplayer").active;
}

// There's a main container and a miniplayer container. We usually want to
// search for elements in whichever one is active, so use this instead of
// document wherever possible.
function getContainer() {
  let selector = isMiniPlayerActive() ? "ytd-miniplayer" : "body > ytd-app > #content";
  return document.querySelector(selector);
}

/**
 * There's a main container and a miniplayer container. We usually want to
 * search for elements in whichever one is active, so use this instead of
 * document.querySelector(selector) wherever possible.
 * @param {String} selector A CSS selector string
 * @returns {DOMNode|undefined} Just like document.querySelector
 */
function findContainerElement(selector) {
  return getContainer().querySelector(selector) || document.querySelector(selector);
}

// Synchronously retrieve info about the video without parsing DOM.
function getVideoDetails() {
  let app = document
    .querySelector("ytd-app")
    .wrappedJSObject?.get("data.playerResponse.videoDetails");
  XPCNativeWrapper(app);
  return app ?? {};
}

// Synchronously retrieve info about the playlist without parsing DOM.
function getPlaylistDetails() {
  let playlist = getContainer().querySelector("#playlist").wrappedJSObject?.get("data");
  XPCNativeWrapper(playlist);
  return playlist ?? {};
}

/**
 * Click a menu button, i.e. thumbs up/down, loop, shuffle. Must be a button
 * contained in #top-level-buttons or #top-level-buttons-computed.
 * @param {DOMNode} menu The container to search for the button in. Should be
 *   the parent of a ytd-menu-renderer element.
 * @param {String} query A data property to search for. This is basically a
 *   selector for a JS property instead of for an HTML attribute. It's needed
 *   because the buttons don't have any identifying HTML attributes. We'd be
 *   forced to just target them by child index otherwise, but such indices
 *   aren't consistent. An example is "data.targetId" which you can see inside
 *   the top level button in the console at button.__data.data.targetId
 * @param {*} [val] The value the data property specified by query should have.
 *   This is optional. If omitted, we'll accept the button regardless of the
 *   property value, as long as it has the property. This is usually a string.
 *   An example matching the above query parameter is "watch-like"
 */
function clickTopLevelButton(menu, { query, val } = {}) {
  if (!menu || !query) return false;
  let buttons = menu.querySelector("#top-level-buttons");
  if (!buttons || buttons.hidden) buttons = menu.querySelector("#top-level-buttons-computed");
  if (!buttons) return;

  buttons = [...buttons.children];
  let button = buttons.find(btn => {
    let found = btn.wrappedJSObject?.get(query);
    XPCNativeWrapper(found);
    if (val) return found === val;
    else return !!found;
  });
  if (!button) return;

  let innerButton = button.wrappedJSObject?.get("button");
  XPCNativeWrapper(innerButton);
  if (typeof innerButton === "object") innerButton.click();
  else button.click();
}

/**
 * Check a menu button's active state. Must be a button contained in
 * #top-level-buttons or #top-level-buttons-computed.
 * @param {DOMNode} menu The container to search for the button in. Should be
 *   the parent of a ytd-menu-renderer element.
 * @param {String} query A data property to search for. This is basically a
 *   selector for a JS property instead of for an HTML attribute. It's needed
 *   because the buttons don't have any identifying HTML attributes. We'd be
 *   forced to just target them by child index otherwise, but such indices
 *   aren't consistent. An example is "data.targetId" which you can see inside
 *   the top level button in the console at button.__data.data.targetId
 * @param {*} [val] The value the data property specified by query should have.
 *   This is optional. If omitted, we'll accept the button regardless of the
 *   property value, as long as it has the property. This is usually a string.
 *   An example matching the above query parameter is "watch-like"
 * @returns {Boolean|Number|null} If the button is a toggle button, return true
 *   if the button is toggled on. If it's a cycle button like the repeat/loop
 *   button, return an integer representing the index of the button's current
 *   state relative to its possible states. These states match the Rainmeter
 *   plugin's repeat states: 0 is loop off, 1 is loop all, 2 is loop one.
 *   Finally, if this method doesn't support the button passed, return null.
 */
function checkTopLevelButton(menu, { query, val } = {}) {
  if (!menu || !query) return null;
  let buttons = menu.querySelector("#top-level-buttons");
  if (!buttons || buttons.hidden) buttons = menu.querySelector("#top-level-buttons-computed");
  if (!buttons) return null;

  buttons = [...buttons.children];
  let button = buttons.find(btn => {
    let found = btn.wrappedJSObject?.get(query);
    XPCNativeWrapper(found);
    if (val) return found === val;
    else return !!found;
  });
  if (!button) return null;

  let data = button.wrappedJSObject?.get("data");
  XPCNativeWrapper(data);
  if (data && data.states) {
    let states = [...data.states]?.map(state => {
      for (let prop in state) {
        if (typeof state[prop] === "object" && "state" in state[prop]) return state[prop].state;
      }
    });
    if (states) {
      // loop states = ["PLAYLIST_LOOP_STATE_NONE", "PLAYLIST_LOOP_STATE_ALL", "PLAYLIST_LOOP_STATE_ONE"];
      let currentState = button.wrappedJSObject?.get("currentState");
      XPCNativeWrapper(currentState);
      if (currentState) return Math.max(states.indexOf(currentState), 0);
    }
  }

  return button.classList.contains("style-default-active");
}

function setup() {
  var youtubeInfoHandler = createNewMusicInfo();

  youtubeInfoHandler.player = function () {
    return "YouTube";
  };

  youtubeInfoHandler.readyCheck = function () {
    let title = findContainerElement("h1.ytd-video-primary-info-renderer.title");
    return title && title.innerText?.length > 0;
  };

  youtubeInfoHandler.state = function () {
    let video = document.querySelector(".html5-main-video");
    let state = video.paused ? 2 : 1;
    if (getContainer().querySelector(".ytp-play-button")?.getAttribute("aria-label") === null) {
      state = 3;
    }
    // It is possible for the video to be "playing" but not started
    if (state == 1 && video.played.length <= 0) state = 2;
    return state;
  };

  youtubeInfoHandler.title = function () {
    let { title } = getVideoDetails();
    if (title) return title;
    return findContainerElement("h1.ytd-video-primary-info-renderer.title")?.innerText;
  };

  youtubeInfoHandler.artist = function () {
    let { author } = getVideoDetails();
    if (author) return author;
    return findContainerElement("#upload-info yt-formatted-string.ytd-channel-name")?.innerText;
  };

  youtubeInfoHandler.album = function () {
    // If using a playlist just use the title of that
    let { title } = getPlaylistDetails();
    if (title?.length) return title;
    let playlist = findContainerElement(".ytd-playlist-panel-renderer.title");
    if (playlist?.innerText !== "") return playlist.innerText;

    // If video has a "Buy or Rent" module use the displayed title & year
    let offer = findContainerElement("#offer-module");
    if (offer?.children.length) {
      let info = offer.querySelector("#info");
      let title = offer.querySelector("#title");
      let result;
      let year;
      if (title?.innerText.length > 0) {
        if (info) {
          let released = document
            .evaluate(
              "//yt-formatted-string[text()='Released']",
              info,
              null,
              XPathResult.ANY_TYPE,
              result
            )
            .iterateNext();
          let module = released?.parentElement;
          year = module?.querySelector("[title]");
          currCategory =
            year?.innerText?.length > 0
              ? `${title?.innerText} (${year?.innerText})`
              : title?.innerText;
        } else currCategory = title?.innerText;
        return currCategory;
      }
    }

    // If playing a video with a hashtag use that
    let superTitle = findContainerElement(".super-title");
    if (superTitle?.children.length > 0) return superTitle.children[0].innerText;

    // Check if the secondary info has a category and is visible
    let info2nd = findContainerElement(".sticky.ytd-video-secondary-info-renderer");
    if (info2nd?.innerText.length > 0 && info2nd.children[0]?.children.length > 0) {
      // Return category if visible else
      try {
        let titles = info2nd?.querySelectorAll("#title");
        let subtitles = info2nd?.querySelectorAll("#subtitle");
        if (titles[0]?.hidden == false && subtitles[0]?.hidden == false)
          currCategory = `${titles[0]?.innerText} (${subtitles[0]?.innerText})`;
        else if (titles[0]?.hidden == false) currCategory = titles[0]?.innerText;
        else if (titles[1]?.hidden == false && subtitles[1]?.hidden == false)
          currCategory = `${titles[1]?.innerText} (${subtitles[1]?.innerText})`;
        else if (titles[1]?.hidden == false) currCategory = titles[1]?.innerText;
        return currCategory;
      } catch (e) {
        return currCategory;
      }
    }
    // Return no album/last category
    return currCategory;
  };

  youtubeInfoHandler.cover = function () {
    let { videoId } = getVideoDetails();
    if (!videoId) videoId = new URLSearchParams(new URL(window.location.href).search).get("v");
    if (videoId && lastImgVideoID !== videoId) {
      lastImgVideoID = videoId;
      const strr = "https://i.ytimg.com/vi/";
      let img = document.createElement("img"),
        qual = "/maxresdefault.jpg";
      img.setAttribute("src", strr + videoId + qual);
      img.addEventListener("load", function () {
        if (img.height > 90) currIMG = strr + videoId + qual;
        else currIMG = strr + videoId + "/hqdefault.jpg?";
      });
      img.addEventListener("error", function () {
        if (img.src.includes("maxresdefault")) {
          qual = "/hqdefault.jpg";
          currIMG = strr + videoId + qual;
        } else if (img.src.includes("hqdefault")) {
          qual = "/mqdefault.jpg";
          currIMG = strr + videoId + qual;
        } else if (img.src.includes("mqdefault")) {
          qual = "/maxresdefault.jpg";
          currIMG = strr + lastImgVideoID + qual;
        }
        img.setAttribute("src", strr + videoId + qual);
      });
    }
    return currIMG;
  };

  youtubeInfoHandler.durationString = function () {
    return (
      document.querySelector(
        (isMiniPlayerActive() ? ".ytp-miniplayer-ui" : ".ytp-left-controls") + " .ytp-time-duration"
      )?.innerText || fancyTimeFormat(document.querySelector(".html5-main-video").duration)
    );
  };

  youtubeInfoHandler.position = function () {
    return document.querySelector(".html5-main-video").currentTime;
  };

  youtubeInfoHandler.volume = function () {
    return document.querySelector(".html5-main-video").volume;
  };

  youtubeInfoHandler.rating = function () {
    let menu = findContainerElement("#menu-container");
    // Thumbs up
    if (checkTopLevelButton(menu, { query: "data.targetId", val: "watch-like" })) return 5;
    // Thumbs down
    if (checkTopLevelButton(menu, { query: "data.targetId", val: "watch-dislike" })) return 1;
    return 0;
  };

  youtubeInfoHandler.repeat = function () {
    if (document.querySelector(".html5-main-video").loop) return 2;
    let menu = findContainerElement("#playlist-action-menu");
    if (menu?.children.length > 0) {
      return Number(checkTopLevelButton(menu, { query: "playlistLoopStateEntity" }));
    }
    return 0;
  };

  youtubeInfoHandler.shuffle = function () {
    let menu = findContainerElement("#playlist-action-menu");
    if (menu?.children.length > 0) {
      return Number(checkTopLevelButton(menu, { query: "buttonIcon", val: "yt-icons:shuffle" }));
    }
    return 0;
  };

  var youtubeEventHandler = createNewMusicEventHandler();

  youtubeEventHandler.readyCheck = null;

  youtubeEventHandler.playpause = function () {
    findContainerElement(".ytp-play-button")?.click();
  };

  youtubeEventHandler.next = function () {
    let next = findContainerElement(".ytp-next-button");
    let playlist = findContainerElement(".playlist-items");
    if (!findContainerElement("#playlist")?.hasAttribute("has-playlist-buttons")) next.click();
    else if (currShuffle == 1) {
      playlist.children[Math.floor(Math.random() * playlist.children.length)]
        .querySelector("#meta")
        ?.click();
    } else if (!playlist.querySelector("#playlist-items:last-of-type")?.selected) {
      playlist
        .querySelector("#playlist-items[selected]")
        ?.nextSibling?.querySelector("#meta")
        ?.click();
    } else if (youtubeInfoHandler.repeat()) {
      playlist.firstElementChild.querySelector("#meta").click();
    } else next.click();
  };

  youtubeEventHandler.previous = function () {
    let video = document.querySelector(".html5-main-video");
    let previous = findContainerElement(".ytp-prev-button");
    if (isMiniPlayerActive()) previous.click();
    else if (previous?.getAttribute("aria-disabled") == "false") previous.click();
    else if (video.currentTime <= 3) history.back();
    else video.currentTime = 0;
  };

  youtubeEventHandler.progressSeconds = function (position) {
    document.querySelector(".html5-main-video").currentTime = position;
  };

  youtubeEventHandler.volume = function (volume) {
    let video = document.querySelector(".html5-main-video");
    video.muted = volume == 0;
    video.volume = volume;
  };

  youtubeEventHandler.repeat = function () {
    let video = document.querySelector(".html5-main-video");
    let menu = findContainerElement("#playlist-action-menu");
    let state = checkTopLevelButton(menu, { query: "playlistLoopStateEntity" });
    if (menu.children.length > 0 && state != null) {
      let click = () => clickTopLevelButton(menu, { query: "playlistLoopStateEntity" });
      // If the new repeat button is enabled, use that. It allows cycling
      // between no loop, loop playlist, and loop one (single video).
      if (typeof state === "number") {
        if (video.loop && state === 0) video.loop = false;
        click();
      } else {
        if (video.loop) {
          video.loop = false;
          if (state) click();
        } else if (state) video.loop = true;
        else click();
      }
    }
    // If there is no repeat button on the page, then use the video's loop
    // property to loop the video
    else video.loop = !video.loop;
  };

  youtubeEventHandler.shuffle = function () {
    let menu = findContainerElement("#playlist-action-menu");
    if (menu?.children.length > 0) {
      clickTopLevelButton(menu, { query: "buttonIcon", val: "yt-icons:shuffle" });
    }
  };

  youtubeEventHandler.toggleThumbsUp = function () {
    clickTopLevelButton(findContainerElement("#menu-container"), {
      query: "data.targetId",
      val: "watch-like",
    });
  };

  youtubeEventHandler.toggleThumbsDown = function () {
    clickTopLevelButton(findContainerElement("#menu-container"), {
      query: "data.targetId",
      val: "watch-dislike",
    });
  };

  youtubeEventHandler.rating = function (rating) {
    clickTopLevelButton(findContainerElement("#menu-container"), {
      query: "data.targetId",
      val: rating < 3 ? "watch-dislike" : "watch-like",
    });
  };
}
