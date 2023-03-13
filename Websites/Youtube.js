// Adds support for YouTube
/* import-globals-from ../WebNowPlaying.js */

let useChapters = false;

function waiveXray(obj) {
  if (typeof obj === "object") {
    if ("wrappedJSObject" in obj) return obj.wrappedJSObject;
  }
  return obj;
}

function findInPossibleXray(obj, key) {
  if (typeof obj === "object") {
    let unwrapped = waiveXray(obj);
    let unwrappedGot = unwrapped.get?.(key);
    if (unwrappedGot) return unwrappedGot;
    let got = obj.get?.(key);
    if (got) return got;
    // If we don't find the target through get(), try to find it with a normal
    // accessor. Keys can have period accessors, which are passed to get() as a
    // single complete string (e.g. "prop1.prop2.prop3"). So we need to access
    // the properties in the same way by splitting the key.
    let keys = key.split(".");
    for (let key of keys) {
      unwrapped = waiveXray(unwrapped)?.[key];
      if (!unwrapped) break;
    }
    if (unwrapped) return unwrapped;
    let prop = obj;
    for (let key of keys) {
      prop = prop?.[key];
      if (!prop) break;
    }
    if (prop) return prop;
  }
  return null;
}

// There's a main container and a miniplayer container. We usually want to
// search for elements in whichever one is active, so use this instead of
// document wherever possible.
function getContainer() {
  let preview = document.getElementsByTagName("ytd-video-preview")[0];
  if (findInPossibleXray(preview, "active")) return preview;
  let miniplayer = document.getElementsByTagName("ytd-miniplayer")[0];
  if (findInPossibleXray(miniplayer, "active")) return miniplayer;
  let manager = document.getElementsByTagName("ytd-watch-flexy")[0];
  if (findInPossibleXray(manager, "active")) return manager;
  return document.body.querySelector("ytd-app > #content");
}

function getVideo() {
  return document.querySelector(".html5-main-video");
}

function getCurrentTime() {
  return findInPossibleXray(getContainer(), "player.getCurrentTime")?.();
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
      details = findInPossibleXray(
        container,
        "videoPreviewFetchRequest.result_.videoDetails"
      );
      break;
    case "ytd-miniplayer":
      details = findInPossibleXray(
        container,
        "watchResponse.playerResponse.videoDetails"
      );
      break;
    case "ytd-watch-flexy":
      details = findInPossibleXray(container, "playerData.videoDetails");
      break;
    default:
      details = findInPossibleXray(
        document.querySelector("ytd-app"),
        "data.playerResponse.videoDetails"
      );
      break;
  }
  return details ?? {};
}

// Synchronously retrieve info about the playlist without parsing DOM.
function getPlaylistDetails() {
  let playlist = findInPossibleXray(findContainerElement("#playlist"), "data");
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
    let found = findInPossibleXray(btn, query);
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
    let found = findInPossibleXray(btn, query);
    if (val) return found === val;
    return !!found;
  });
  if (!button) return null;

  let data = findInPossibleXray(button, "data");
  if (data && data.states) {
    let states = [...data.states]?.map(state => {
      for (let prop in state) {
        if (typeof state[prop] === "object" && "state" in state[prop]) {
          return state[prop].state;
        }
      }
      return null;
    });
    if (states) {
      // loop states = ["PLAYLIST_LOOP_STATE_NONE", "PLAYLIST_LOOP_STATE_ALL", "PLAYLIST_LOOP_STATE_ONE"];
      let currentState = findInPossibleXray(button, "currentState");
      if (currentState) return Math.max(states.indexOf(currentState), 0);
    }
  }

  return (
    button.classList.contains("style-default-active") ||
    button.getAttribute("aria-pressed") == "true" ||
    !!button.querySelector("[aria-pressed='true']")
  );
}

/**
 * Get a list of "chapters" from comments on the video. This can happen in long
 * videos (like whole music albums) where people comment the time of each song,
 * and YouTube automatically converts them into fragment links that jump to the
 * time when clicked. This function finds those links and returns a list of
 * times in seconds.
 * @returns {number[]|null} A list of times in seconds, or null if none exist.
 */
function findChapterListInComments() {
  let currentURL = new URL(window.location.href);
  function getSeconds(el) {
    if (!el.href) return null;
    let linkURL = new URL(el.href);
    if (
      linkURL.pathname === currentURL.pathname &&
      linkURL.searchParams.get("v") === currentURL.searchParams.get("v")
    ) {
      let timeString = linkURL.searchParams.get("t");
      if (timeString !== null) {
        let time = parseInt(timeString);
        if (!isNaN(time)) return time;
      }
    }
    return null;
  }
  let lists = [
    ...document.querySelectorAll(
      "ytd-comment-thread-renderer>ytd-comment-renderer#comment"
    ),
  ]
    .map(comment =>
      [...comment.querySelector("#content-text").children]
        .map(el => getSeconds(el))
        .filter(t => t !== null)
    )
    .filter(l => l.length > 2)
    .sort((a, b) => a.length < b.length);
  return lists[0];
}

/**
 * Get a list of "chapters" from a panel rendered by YouTube in the right
 * sidebar. This can happen if the video author has added a list of timestamps
 * in the video's description, or if YouTube has automatically calculated the
 * key moments of the video.
 * @param {Element} panel The panel to search for the list in. Should be a
 *   ytd-engagement-panel-section-list-renderer and the ancestor of a
 *   ytd-macro-markers-list-renderer element.
 * @returns {number[]|null} A list of times in seconds, or null if none exist.
 */
function findMarkerList(panel) {
  if (!panel) return null;
  let links = [
    ...panel.querySelectorAll("ytd-macro-markers-list-item-renderer > a"),
  ];
  let times = links
    .map(el => {
      if (!el.href) return null;
      let linkURL = new URL(el.href);
      let timeString = linkURL.searchParams.get("t");
      if (timeString !== null) {
        let time = parseInt(timeString);
        if (!isNaN(time)) return time;
      }
      return null;
    })
    .filter(t => t !== null);
  if (times.length > 2) return times;
  return null;
}

/**
 * Look for a list of "chapters" in a variety of places, in order of usefulness.
 * Returns an array of times in seconds, or null if none exist.
 * @returns {number[]|null} A list of times in seconds, or null if none exist.
 */
function findChapterList() {
  let container = getContainer();
  if (
    container.localName !== "ytd-watch-flexy" &&
    container?.id !== "content"
  ) {
    return null;
  }
  // First, check for a list of chapters in the video's description. These are
  // added by the video author, so they're more likely to be accurate.
  let descriptionChapters = document.querySelector(
    `ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"]`
  );
  let descriptionChaptersList = findMarkerList(descriptionChapters);
  if (descriptionChaptersList) return descriptionChaptersList;
  // If there's no list in the description, check for a list of chapters in the
  // comments. These are added by viewers, so they're less likely to be
  // accurate, but they're still better than nothing.
  let commentList = findChapterListInComments();
  if (commentList) return commentList;
  // Finally, look for chapters generated automatically by YouTube's AI. We
  // ignore auto-generated chapters for videos shorter than 15 minutes, as they
  // can be annoying or inaccurate in shorter videos.
  if (getVideo()?.duration > 900) {
    let autoChapters = document.querySelector(
      `ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-auto-chapters"]`
    );
    let autoChaptersList = findMarkerList(autoChapters);
    if (autoChaptersList) return autoChaptersList;
  }
  return null;
}

/**
 * Get the next and previous chapter times in the video, based on chapter lists
 * found in the document. Not all videos will have a chapter list. If the
 * current time is within 3 seconds of the start of a chapter, it will return
 * the chapter before it as the previous time. This is so that the user can
 * double-tap the skip previous button to go to the previous chapter, rather
 * than only being able to skip to the start of the current chapter.
 * @returns {NearestChapters} An object with the next and previous chapter
 *   times, or null if no chapters exist.
 */
function getNearestChapters() {
  if (!useChapters) return null;
  let timeList = findChapterList()?.sort((a, b) => a - b);
  if (!timeList) return null;
  let video = getVideo();
  let current = video.currentTime || getCurrentTime();
  let next = null;
  let previous = null;
  for (let i = 0; i < timeList.length; i++) {
    if (timeList[i] > current) {
      next = timeList[i];
      break;
    }
    // If the current time is within 3 seconds of the previous time, it means
    // they are probably double tapping the skip previous function. So use the
    // previous previous time. That way the first time they tap, it will go to
    // the start of the current range, and the second time it will go to the
    // start of the previous range.
    previous = current - timeList[i] <= 3 ? previous : timeList[i];
  }

  /**
   * @typedef {Object} NearestChapters
   * @property {number|null} next The next time in seconds, or null.
   * @property {number|null} previous The previous time in seconds, or null.
   * @property {number} current The current time in seconds.
   */
  return { next, previous, current };
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
    let title = findContainerElement(
      ".metadata .title, #info .title, #meta #video-title"
    );
    return title && title.innerText?.length > 0;
  };

  youtubeInfoHandler.state = function() {
    let video = getVideo();
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
    return findContainerElement(
      ".metadata .title, #info .title, #meta #video-title"
    )?.innerText;
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
        else currImg = `${strr + videoId}/hqdefault.jpg?`;
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
      fancyTimeFormat(getVideo()?.duration)
    );
  };

  youtubeInfoHandler.position = function() {
    return getVideo()?.currentTime || getCurrentTime();
  };

  youtubeInfoHandler.volume = function() {
    let video = getVideo();
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
    if (getVideo()?.loop) return 2;
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
    let chapters = getNearestChapters();
    if (chapters?.next) {
      getVideo().currentTime = chapters.next;
      return;
    }
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
      !playlist
        .querySelector("#playlist-items:last-of-type")
        ?.hasAttribute("selected")
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
    let video = getVideo();
    let chapters = getNearestChapters();
    if (typeof chapters?.previous == "number") {
      video.currentTime = chapters.previous;
      return;
    }
    let previous = findControlElement(".ytp-prev-button");
    if (previous?.getAttribute("aria-disabled") == "false") {
      previous.click();
    } else if (
      getContainer().localName == "ytd-watch-flexy" &&
      (video.currentTime || getCurrentTime()) <= 3
    ) {
      history.back();
    } else {
      video.currentTime = 0;
    }
  };

  youtubeEventHandler.progressSeconds = function(position) {
    let video = getVideo();
    if (video) video.currentTime = position;
  };

  youtubeEventHandler.volume = function(volume) {
    let video = getVideo();
    video.muted = volume == 0;
    video.volume = volume;
  };

  youtubeEventHandler.repeat = function() {
    let video = getVideo();
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

  chrome.storage.sync
    .get({ useChapters })
    .then(res => (useChapters = res.useChapters));
}
