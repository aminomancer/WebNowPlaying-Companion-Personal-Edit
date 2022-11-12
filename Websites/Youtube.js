// Adds support for YouTube
/* import-globals-from ../WebNowPlaying.js */

function waiveXray(obj) {
  if (typeof obj === "object") {
    return "wrappedJSObject" in obj ? obj.wrappedJSObject : obj;
  }
}

// There's a main container and a miniplayer container. We usually want to
// search for elements in whichever one is active, so use this instead of
// document wherever possible.
function getContainer() {
  let preview = document.getElementsByTagName("ytd-video-preview")[0];
  if (preview?.active) return preview;
  let miniplayer = document.getElementsByTagName("ytd-miniplayer")[0];
  if (miniplayer?.active) return miniplayer;
  let manager = document.getElementsByTagName("ytd-watch-flexy")[0];
  if (manager?.active) return manager;
  return document.body.querySelector("ytd-app > #content");
}

/**
 * There's a main container and a miniplayer container. We usually want to
 * search for elements in whichever one is active, so use this instead of
 * document.querySelector(selector) wherever possible.
 * @param {string} selector A CSS selector string
 * @returns {Element|undefined} Just like document.querySelector
 */
function findContainerElement(selector) {
  return (
    getContainer().querySelector(selector) || document.querySelector(selector)
  );
}

function findControlElement(selector) {
  let sel;
  let container = getContainer();
  switch (container.localName) {
    case "ytd-video-preview":
      sel = selector;
      break;
    case "ytd-miniplayer":
      sel = `.ytp-miniplayer-ui ${selector}`;
      break;
    default:
      sel = `.ytp-chrome-bottom ${selector}`;
      break;
  }
  return container.querySelector(sel) || document.querySelector(sel);
}

// Synchronously retrieve info about the video without parsing DOM.
function getVideoDetails() {
  let details;
  let container = getContainer();
  switch (container.localName) {
    case "ytd-video-preview":
      details = waiveXray(container).get(
        "videoPreviewFetchRequest.result_.videoDetails"
      );
      break;
    case "ytd-miniplayer":
      details = waiveXray(container).get(
        "watchResponse.playerResponse.videoDetails"
      );
      break;
    case "ytd-watch-flexy":
      details = waiveXray(container).get("playerData.videoDetails");
      break;
    default:
      details = waiveXray(document.querySelector("ytd-app"))?.get(
        "data.playerResponse.videoDetails"
      );
      break;
  }
  return details ?? {};
}

// Synchronously retrieve info about the playlist without parsing DOM.
function getPlaylistDetails() {
  let playlist = waiveXray(findContainerElement("#playlist"))?.get("data");
  return playlist ?? {};
}

/**
 * Click a menu button, i.e. thumbs up/down, loop, shuffle. Must be a button
 * contained in #top-level-buttons or #top-level-buttons-computed.
 * @param {Element} menu The container to search for the button in. Should be
 *   the parent of a ytd-menu-renderer element.
 * @param {string} query A data property to search for. This is basically a
 *   selector for a JS property instead of for an HTML attribute. It's needed
 *   because the buttons don't have any identifying HTML attributes. We'd be
 *   forced to just target them by child index otherwise, but such indices
 *   aren't consistent. An example is "data.targetId" which you can see inside
 *   the top level button in the console at button.__data.data.targetId
 * @param {*} [val] The value the data property specified by query should have.
 *   This is optional. If omitted, we'll accept the button regardless of the
 *   property value, as long as it has the property. This is usually a string.
 *   An example matching the above query parameter is "watch-like"
 * @returns {boolean} Whether the button was found and clicked
 */
function clickTopLevelButton(menu, { query, val } = {}) {
  if (!menu || !query) return false;
  let buttons = menu.querySelector("#top-level-buttons-computed");
  if (!buttons || buttons.hidden) {
    buttons = menu.querySelector("#top-level-buttons");
  }
  if (!buttons) return false;

  buttons = [...buttons.children];
  let button = buttons.find(btn => {
    let found = waiveXray(btn)?.get(query);
    if (val) return found === val;
    return !!found;
  });
  if (!button) return false;

  button = button.querySelector("button") ?? button;
  button.onclick ? button.onclick() : button.click();
  return true;
}

/**
 * Check a menu button's active state. Must be a button contained in
 * #top-level-buttons or #top-level-buttons-computed.
 * @param {Element} menu The container to search for the button in. Should be
 *   the parent of a ytd-menu-renderer element.
 * @param {string} query A data property to search for. This is basically a
 *   selector for a JS property instead of for an HTML attribute. It's needed
 *   because the buttons don't have any identifying HTML attributes. We'd be
 *   forced to just target them by child index otherwise, but such indices
 *   aren't consistent. An example is "data.targetId" which you can see inside
 *   the top level button in the console at button.__data.data.targetId
 * @param {*} [val] The value the data property specified by query should have.
 *   This is optional. If omitted, we'll accept the button regardless of the
 *   property value, as long as it has the property. This is usually a string.
 *   An example matching the above query parameter is "watch-like"
 * @returns {boolean|number|null} If the button is a toggle button, return true
 *   if the button is toggled on. If it's a cycle button like the repeat/loop
 *   button, return an integer representing the index of the button's current
 *   state relative to its possible states. These states match the Rainmeter
 *   plugin's repeat states: 0 is loop off, 1 is loop all, 2 is loop one.
 *   Finally, if this method doesn't support the button passed, return null.
 */
function checkTopLevelButton(menu, { query, val } = {}) {
  if (!menu || !query) return null;
  let buttons = menu.querySelector("#top-level-buttons-computed");
  if (!buttons || buttons.hidden) {
    buttons = menu.querySelector("#top-level-buttons");
  }
  if (!buttons) return null;

  buttons = [...buttons.children];
  let button = buttons.find(btn => {
    let found = waiveXray(btn)?.get(query);
    if (val) return found === val;
    return !!found;
  });
  if (!button) return null;

  let data = waiveXray(button)?.get("data");
  if (data && data.states) {
    let states = [...data.states]?.map(state => {
      for (let prop in state) {
        if (typeof state[prop] === "object" && "state" in state[prop]) {
          return state[prop].state;
        }
      }
    });
    if (states) {
      // loop states = ["PLAYLIST_LOOP_STATE_NONE", "PLAYLIST_LOOP_STATE_ALL", "PLAYLIST_LOOP_STATE_ONE"];
      let currentState = waiveXray(button)?.get("currentState");
      if (currentState) return Math.max(states.indexOf(currentState), 0);
    }
  }

  return (
    button.classList.contains("style-default-active") ||
    button.getAttribute("aria-pressed") == "true"
  );
}

function setup() {
  let lastImgVideoID = "";
  let currImg = "";
  let currCategory = "";

  let youtubeInfoHandler = createNewMusicInfo();

  youtubeInfoHandler.player = function() {
    return "YouTube";
  };

  youtubeInfoHandler.readyCheck = function() {
    let title = findContainerElement(".title, #video-title");
    return title && title.innerText?.length > 0;
  };

  youtubeInfoHandler.state = function() {
    let video = document.querySelector(".html5-main-video");
    let state = video.paused ? 2 : 1;
    if (
      getContainer()
        .querySelector(".ytp-play-button")
        ?.getAttribute("aria-label") === null
    ) {
      state = 3;
    }
    // It is possible for the video to be "playing" but not started
    if (state == 1 && video.played.length <= 0) state = 2;
    return state;
  };

  youtubeInfoHandler.title = function() {
    let { title } = getVideoDetails();
    if (title) return title;
    return findContainerElement(".title, #video-title")?.innerText;
  };

  youtubeInfoHandler.artist = function() {
    let { author } = getVideoDetails();
    if (author) return author;
    return findContainerElement(
      `#meta yt-formatted-string.ytd-channel-name, .channel #owner-name`
    )?.innerText;
  };

  youtubeInfoHandler.album = function() {
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
        } else {
          currCategory = title?.innerText;
        }
        return currCategory;
      }
    }

    // Check if the secondary info has a category and is visible
    let info2nd = findContainerElement(
      ".sticky.ytd-video-secondary-info-renderer"
    );
    if (
      info2nd?.innerText.length > 0 &&
      info2nd.children[0]?.children.length > 0
    ) {
      // Return category if visible else
      try {
        let titles = info2nd?.querySelectorAll("#title");
        let subtitles = info2nd?.querySelectorAll("#subtitle");
        if (!titles[0]?.hidden && !subtitles[0]?.hidden) {
          currCategory = `${titles[0]?.innerText} (${subtitles[0]?.innerText})`;
        } else if (!titles[0]?.hidden) {
          currCategory = titles[0]?.innerText;
        } else if (!titles[1]?.hidden && !subtitles[1]?.hidden) {
          currCategory = `${titles[1]?.innerText} (${subtitles[1]?.innerText})`;
        } else if (!titles[1]?.hidden) {
          currCategory = titles[1]?.innerText;
        }
        return currCategory;
      } catch (e) {
        return currCategory;
      }
    }

    // If playing a video with a hashtag use that
    let hashTags = findContainerElement(".super-title")?.querySelectorAll("a");
    if (hashTags?.length) {
      return (
        [...hashTags]
          .slice(0, 3)
          .map(ht => ht.innerText)
          .join(" ") || currCategory
      );
    }

    // Return no album/last category
    return currCategory;
  };

  youtubeInfoHandler.cover = function() {
    let { videoId } = getVideoDetails();
    if (!videoId) {
      videoId = new URLSearchParams(new URL(window.location.href).search).get(
        "v"
      );
    }
    if (videoId && lastImgVideoID !== videoId) {
      lastImgVideoID = videoId;
      const strr = "https://i.ytimg.com/vi/";
      let img = document.createElement("img"),
        qual = "/maxresdefault.jpg";
      img.setAttribute("src", strr + videoId + qual);
      img.addEventListener("load", function() {
        if (img.height > 90) currImg = strr + videoId + qual;
        else currImg = strr + videoId + "/hqdefault.jpg?";
      });
      img.addEventListener("error", function() {
        if (img.src.includes("maxresdefault")) {
          qual = "/hqdefault.jpg";
          currImg = strr + videoId + qual;
        } else if (img.src.includes("hqdefault")) {
          qual = "/mqdefault.jpg";
          currImg = strr + videoId + qual;
        } else if (img.src.includes("mqdefault")) {
          qual = "/maxresdefault.jpg";
          currImg = strr + lastImgVideoID + qual;
        }
        img.setAttribute("src", strr + videoId + qual);
      });
    }
    return currImg;
  };

  youtubeInfoHandler.durationString = function() {
    return (
      findControlElement(".ytp-time-duration")?.innerText ||
      fancyTimeFormat(document.querySelector(".html5-main-video").duration)
    );
  };

  youtubeInfoHandler.position = function() {
    return document.querySelector(".html5-main-video").currentTime;
  };

  youtubeInfoHandler.volume = function() {
    let video = document.querySelector(".html5-main-video");
    if (!video.muted) return video.volume;
    return 0;
  };

  youtubeInfoHandler.rating = function() {
    let menu = findContainerElement("#menu-container");
    // Thumbs up
    if (
      // 2 different possible layouts
      checkTopLevelButton(menu, {
        query: "data.targetId",
        val: "watch-like",
      }) ??
      document
        .querySelector("#segmented-like-button button")
        ?.getAttribute("aria-pressed") == "true"
    ) {
      return 5;
    }
    // Thumbs down
    if (
      checkTopLevelButton(menu, {
        query: "data.targetId",
        val: "watch-dislike",
      }) ??
      document
        .querySelector("#segmented-dislike-button button")
        ?.getAttribute("aria-pressed") == "true"
    ) {
      return 1;
    }
    return 0;
  };

  youtubeInfoHandler.repeat = function() {
    if (document.querySelector(".html5-main-video").loop) return 2;
    let menu = findContainerElement("#playlist-action-menu");
    if (menu?.children.length > 0) {
      return Number(
        checkTopLevelButton(menu, { query: "playlistLoopStateEntity" })
      );
    }
    return 0;
  };

  youtubeInfoHandler.shuffle = function() {
    let menu = findContainerElement("#playlist-action-menu");
    if (menu?.children.length > 0) {
      return Number(
        checkTopLevelButton(menu, {
          query: "data.defaultIcon.iconType",
          val: "SHUFFLE",
        })
      );
    }
    return 0;
  };

  let youtubeEventHandler = createNewMusicEventHandler();

  youtubeEventHandler.readyCheck = null;

  youtubeEventHandler.playpause = function() {
    findControlElement(".ytp-play-button")?.click();
  };

  youtubeEventHandler.next = function() {
    let next = findControlElement(".ytp-next-button");
    let playlist = findContainerElement(".playlist-items");
    if (
      !findContainerElement("#playlist")?.hasAttribute("has-playlist-buttons")
    ) {
      next.click();
    } else if (currShuffle == 1) {
      playlist.children[Math.floor(Math.random() * playlist.children.length)]
        .querySelector("#meta")
        ?.click();
    } else if (
      !playlist.querySelector("#playlist-items:last-of-type")?.selected
    ) {
      playlist
        .querySelector("#playlist-items[selected]")
        ?.nextSibling?.querySelector("#meta")
        ?.click();
    } else if (
      checkTopLevelButton(findContainerElement("#playlist-action-menu"), {
        query: "playlistLoopStateEntity",
      }) // Repeat playlist
    ) {
      playlist.firstElementChild.querySelector("#meta").click();
    } else {
      next.click();
    }
  };

  youtubeEventHandler.previous = function() {
    let video = document.querySelector(".html5-main-video");
    let previous = findControlElement(".ytp-prev-button");
    if (previous?.getAttribute("aria-disabled") == "false") {
      previous.click();
    } else if (
      getContainer().localName == "ytd-watch-flexy" &&
      video.currentTime <= 3
    ) {
      history.back();
    } else {
      video.currentTime = 0;
    }
  };

  youtubeEventHandler.progressSeconds = function(position) {
    document.querySelector(".html5-main-video").currentTime = position;
  };

  youtubeEventHandler.volume = function(volume) {
    let video = document.querySelector(".html5-main-video");
    video.muted = volume == 0;
    video.volume = volume;
  };

  youtubeEventHandler.repeat = function() {
    let video = document.querySelector(".html5-main-video");
    let menu = findContainerElement("#playlist-action-menu");
    let state = checkTopLevelButton(menu, { query: "playlistLoopStateEntity" });
    if (menu.children.length && state != null) {
      let click = () =>
        clickTopLevelButton(menu, { query: "playlistLoopStateEntity" });
      // If the new repeat button is enabled, use that. It allows cycling
      // between no loop, loop playlist, and loop one (single video).
      if (typeof state === "number") {
        if (video.loop && state === 0) video.loop = false;
        click();
      } else if (video.loop) {
        video.loop = false;
        if (state) click();
      } else if (state) {
        video.loop = true;
      } else {
        click();
      }
    }
    // If there is no repeat button on the page, then use the video's loop
    // property to loop the video
    else {
      video.loop = !video.loop;
    }
  };

  youtubeEventHandler.shuffle = function() {
    let menu = findContainerElement("#playlist-action-menu");
    if (menu?.children.length > 0) {
      clickTopLevelButton(menu, {
        query: "data.defaultIcon.iconType",
        val: "SHUFFLE",
      });
    }
  };

  youtubeEventHandler.toggleThumbsUp = function() {
    clickTopLevelButton(findContainerElement("#menu-container"), {
      query: "data.targetId",
      val: "watch-like",
    }) || document.querySelector("#segmented-like-button button")?.onclick?.();
  };

  youtubeEventHandler.toggleThumbsDown = function() {
    clickTopLevelButton(findContainerElement("#menu-container"), {
      query: "data.targetId",
      val: "watch-dislike",
    }) ||
      document.querySelector("#segmented-dislike-button button")?.onclick?.();
  };

  youtubeEventHandler.rating = function(rating) {
    youtubeEventHandler[`toggleThumbs${rating < 3 ? "Down" : "Up"}`]();
  };
}
