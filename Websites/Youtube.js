// Adds support for the new youtube layout
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize*/

var lastImgVideoID = "";
var lastAlbumVideoID = "";
var currImg = "";
var currCategory = "";
var wasMadeVisable = false;

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

function getContainer() {
  let selector = isMiniPlayerActive() ? "ytd-miniplayer" : "body > ytd-app > #content";
  return document.querySelector(selector);
}

function findContainerElement(selector) {
  return getContainer().querySelector(selector) || document.querySelector(selector);
}

function getVideoDetails() {
  return (
    document.querySelector("ytd-app").wrappedJSObject?.data?.playerResponse?.videoDetails ?? {}
  );
}

function getPlaylist() {
  return getContainer().querySelector("#playlist").wrappedJSObject?.data ?? {};
}

// click a menu button i.e. thumbs up/down, loop, shuffle.
// menu narrows the check, i is the DOM index of the desired button
function clickTopLevelButton(menu, i) {
  if (!menu) return;
  let topLevelButtons = menu.querySelector("#top-level-buttons");
  if (!topLevelButtons || topLevelButtons.hidden)
    topLevelButtons = menu.querySelector("#top-level-buttons-computed");
  let renderer = topLevelButtons?.children[i];
  if (typeof renderer.wrappedJSObject.button === "object") renderer.wrappedJSObject.button.click();
  else renderer.click();
}

// check active state for a menu button i.e. thumbs up/down, loop, shuffle.
// menu narrows the check, i is the DOM index of the desired button
function checkTopLevelButton(menu, i) {
  let topLevelButtons = menu.querySelector("#top-level-buttons");
  if (!topLevelButtons || topLevelButtons.hidden)
    topLevelButtons = menu.querySelector("#top-level-buttons-computed");
  let renderer = topLevelButtons?.children[i];
  let states = ["PLAYLIST_LOOP_STATE_NONE", "PLAYLIST_LOOP_STATE_ALL", "PLAYLIST_LOOP_STATE_ONE"];
  let currentState = renderer.wrappedJSObject.get("currentState");
  if (states && currentState) return Math.max(states.indexOf(currentState), 0);
  return renderer.classList.contains("style-default-active");
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
    let { title } = getPlaylist();
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
    let { videoId, thumbnail } = getVideoDetails();
    if (!videoId) videoId = new URLSearchParams(new URL(window.location.href).search).get("v");
    if (lastImgVideoID !== videoId && videoId) {
      lastImgVideoID = videoId;
      const thumbnails = [...thumbnail?.thumbnails].sort((a, b) => a.height < b.height);
      let img = document.createElement("img");
      let idx = 0;
      img.setAttribute("src", `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
      img.addEventListener("load", () => {
        currImg = img.src;
      });
      img.addEventListener("error", () => {
        let newImg = thumbnails[idx++]?.url;
        if (newImg) img.setAttribute("src", newImg);
        else img.remove();
      });
    }
    return currImg;
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
    // Check if thumbs button is active
    if (checkTopLevelButton(menu, 0)) return 5; // thumbs up
    if (checkTopLevelButton(menu, 1)) return 1; // thumbs down
    return 0;
  };
  youtubeInfoHandler.repeat = function () {
    if (document.querySelector(".html5-main-video").loop) return 2;
    let menu = findContainerElement("#playlist-action-menu");
    if (menu?.children.length > 0) return Number(checkTopLevelButton(menu, 0));
    return 0;
  };
  youtubeInfoHandler.shuffle = function () {
    let menu = findContainerElement("#playlist-action-menu");
    if (menu?.children.length > 0) return Number(checkTopLevelButton(menu, 1));
    return 0;
  };

  var youtubeEventHandler = createNewMusicEventHandler();

  // Define custom check logic to make sure you are not trying to update info when nothing is playing
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
    if (
      findContainerElement("#playlist")?.wrappedJSObject.hasPlaylistButtons &&
      menu.children.length > 0
    ) {
      let state = checkTopLevelButton(menu, 0);
      let click = () => clickTopLevelButton(menu, 0);
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
    if (menu?.children.length > 0) clickTopLevelButton(menu, 1);
  };
  youtubeEventHandler.toggleThumbsUp = function () {
    clickTopLevelButton(findContainerElement("#menu-container"), 0);
  };
  youtubeEventHandler.toggleThumbsDown = function () {
    clickTopLevelButton(findContainerElement("#menu-container"), 1);
  };
  youtubeEventHandler.rating = function (rating) {
    clickTopLevelButton(findContainerElement("#menu-container"), rating < 3 ? 1 : 0);
  };
}
