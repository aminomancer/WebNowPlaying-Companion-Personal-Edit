//Adds support for the new youtube layout
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize fancyTimeFormat currShuffle*/

function setupEmbedded() {
  let lastImgVideoID = "";
  let currImg = "";
  let currCategory = "";
  let shuffleState = 0;

  let youtubeEmbeddedInfoHandler = createNewMusicInfo();

  youtubeEmbeddedInfoHandler.player = function() {
    return "YouTube Embedded";
  };

  youtubeEmbeddedInfoHandler.readyCheck = function() {
    let title = document.getElementsByClassName("ytp-title-text");
    return (
      !!title.length &&
      !!title[0].innerText.length &&
      !document
        .getElementsByClassName("html5-video-player")[0]
        .classList.contains("unstarted-mode")
    );
  };

  youtubeEmbeddedInfoHandler.state = function() {
    let video = document.getElementsByClassName("html5-main-video")[0],
      state = video.paused ? 2 : 1;
    if (
      video.readyState === 0 ||
      document
        .getElementsByClassName("ytp-play-button")[0]
        .getAttribute("aria-label") === null
    ) {
      state = 3;
    }
    //It is possible for the video to be "playing" but not started
    if (state == 1 && video.played.length <= 0) {
      state = 2;
    }
    return state;
  };

  youtubeEmbeddedInfoHandler.title = function() {
    return document.getElementsByClassName("ytp-title-text")[0].innerText;
  };

  youtubeEmbeddedInfoHandler.artist = function() {
    return document.getElementsByClassName("ytp-title-expanded-title")[0]
      .innerText;
  };

  youtubeEmbeddedInfoHandler.album = function() {
    let playlist = document.getElementsByClassName(
      "ytp-playlist-menu-title"
    )[0];
    if (playlist?.innerText.length > 0) {
      return playlist.innerText;
    }
    return currCategory;
  };

  youtubeEmbeddedInfoHandler.cover = function() {
    let videoID = new URLSearchParams(
      document.getElementsByClassName("ytp-title-link")[0]?.search
    )?.get("v");

    if (lastImgVideoID !== videoID && videoID) {
      lastImgVideoID = videoID;
      const strr = "https://i.ytimg.com/vi/";
      let img = document.createElement("img"),
        qual = "/maxresdefault.jpg?";
      img.setAttribute("src", strr + videoID + qual);
      img.addEventListener("load", function() {
        if (img.height > 90) {
          currImg = strr + videoID + qual;
        } else {
          currImg = strr + videoID + "/hqdefault.jpg?";
        }
      });
      img.addEventListener("error", function() {
        if (img.src.includes("maxresdefault")) {
          qual = "/hqdefault.jpg?";
          currImg = strr + videoID + qual;
        } else if (img.src.includes("hqdefault")) {
          qual = "/mqdefault.jpg?";
          currImg = strr + videoID + qual;
        } else if (img.src.includes("mqdefault")) {
          qual = "/maxresdefault.jpg?";
          currImg = strr + lastImgVideoID + qual;
        }
        img.setAttribute("src", strr + videoID + qual);
      });
    }

    return currImg;
  };

  youtubeEmbeddedInfoHandler.durationString = function() {
    return (
      document.getElementsByClassName("ytp-time-duration")[0]?.innerText ||
      fancyTimeFormat(document.getElementsByClassName("html5-main-video")[0])
    );
  };

  youtubeEmbeddedInfoHandler.position = function() {
    return document.getElementsByClassName("html5-main-video")[0].currentTime;
  };

  youtubeEmbeddedInfoHandler.volume = function() {
    return document.getElementsByClassName("html5-main-video")[0].volume;
  };

  youtubeEmbeddedInfoHandler.rating = function() {
    return 0;
  };

  youtubeEmbeddedInfoHandler.repeat = function() {
    if (document.getElementsByClassName("html5-main-video")[0].loop) {
      return 2;
    }
    return 0;
  };

  youtubeEmbeddedInfoHandler.shuffle = function() {
    return shuffleState;
  };

  let youtubeEmbeddedEventHandler = createNewMusicEventHandler();

  let playlistClicked = false;

  //Define custom check logic to make sure you are not trying to update info when nothing is playing
  // youtubeEmbeddedEventHandler.readyCheck = null;

  youtubeEmbeddedEventHandler.readyCheck = function() {
    return !document
      .getElementsByClassName("html5-video-player")[0]
      ?.classList.contains("unstarted-mode");
  };

  youtubeEmbeddedEventHandler.playpause = function() {
    document.getElementsByClassName("ytp-play-button")[0]?.click();
  };

  youtubeEmbeddedEventHandler.next = function() {
    if (
      shuffleState &&
      new URLSearchParams(
        document.getElementsByClassName("ytp-title-link")[0]?.search
      )?.get("list")
    ) {
      let playlist = document.getElementsByClassName(
        "ytp-playlist-menu-items"
      )[0];
      if (!playlistClicked && playlist?.children.length === 0) {
        let open = document.getElementsByClassName(
          "ytp-playlist-menu-button"
        )[0];
        open?.click();
        open?.click();
        playlistClicked = true;
      }
      playlist?.children[
        Math.floor(Math.random() * playlist?.children.length)
      ].click();
    } else {
      let next = document.getElementsByClassName("ytp-next-button")[0];
      if (next?.getAttribute("aria-disabled") !== "true") {
        next.click();
      } else {
      }
    }
  };

  youtubeEmbeddedEventHandler.previous = function() {
    let video = document.getElementsByClassName("html5-main-video")[0],
      previous = document.getElementsByClassName("ytp-prev-button")[0];
    if (
      shuffleState &&
      new URLSearchParams(
        document.getElementsByClassName("ytp-title-link")[0]?.search
      )?.get("list")
    ) {
      if (video.currentTime <= 3) {
        let playlist = document.getElementsByClassName(
          "ytp-playlist-menu-items"
        )[0];
        if (!playlistClicked && playlist?.children.length === 0) {
          let open = document.getElementsByClassName(
            "ytp-playlist-menu-button"
          )[0];
          open.click();
          open.click();
          playlistClicked = true;
        }
        playlist?.children[
          Math.floor(Math.random() * playlist?.children.length)
        ].click();
      } else {
        video.currentTime = 0;
      }
    } else if (
      previous?.getAttribute("aria-disabled") !== "true" &&
      video.currentTime <= 3
    ) {
      previous.click();
    } else {
      video.currentTime = 0;
    }
  };

  youtubeEmbeddedEventHandler.progressSeconds = function(position) {
    document.getElementsByClassName(
      "html5-main-video"
    )[0].currentTime = position;
  };

  youtubeEmbeddedEventHandler.volume = function(volume) {
    let video = document.getElementsByClassName("html5-main-video")[0];
    if (video.muted && volume > 0) {
      video.muted = false;
    } else if (volume == 0) {
      video.muted = true;
    }
    video.volume = volume;
  };

  youtubeEmbeddedEventHandler.repeat = function() {
    let video = document.getElementsByClassName("html5-main-video")[0];
    video.loop = !video.loop;
  };

  youtubeEmbeddedEventHandler.shuffle = function() {
    let search = new URLSearchParams(
      document.getElementsByClassName("ytp-title-link")[0]?.search
    );
    let list = search?.get("list");
    if (list) shuffleState = Number(!shuffleState);
    else shuffleState = 0;
  };

  youtubeEmbeddedEventHandler.toggleThumbsUp = function() {};

  youtubeEmbeddedEventHandler.toggleThumbsDown = function() {};

  youtubeEmbeddedEventHandler.rating = function(rating) {};
}

setupEmbedded();
init();
