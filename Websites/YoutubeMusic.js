//Adds support for Youtube Music
/* import-globals-from ../WebNowPlaying.js */

function setup() {
  let lastImgVideoID = "";
  let currImg = "";

  let ymInfoHandler = createNewMusicInfo();

  ymInfoHandler.player = function() {
    return "YouTube Music";
  };

  ymInfoHandler.readyCheck = function() {
    if (
      document.getElementsByTagName("video").length &&
      document.getElementsByClassName("title ytmusic-player-bar")[0].innerText
        .length
    ) {
      return true;
    }
    return false;
  };

  ymInfoHandler.state = function() {
    return document.getElementsByTagName("video")[0].paused ? 2 : 1;
  };
  ymInfoHandler.title = function() {
    return document.getElementsByClassName("title ytmusic-player-bar")[0]
      .innerText;
  };
  ymInfoHandler.artist = function() {
    //If has both artist and album return artist
    if (
      document.getElementsByClassName("byline ytmusic-player-bar")[0].children
        .length
    ) {
      return document.getElementsByClassName("byline ytmusic-player-bar")[0]
        .children[0].innerText;
    }
    //Otherwise it is a video and just has uploader name
    return document.getElementsByClassName("byline ytmusic-player-bar")[0]
      .innerText;
  };
  ymInfoHandler.album = function() {
    //If has both artist and album return album
    if (
      document.getElementsByClassName("byline ytmusic-player-bar")[0].children
        .length > 1
    ) {
      return document.getElementsByClassName("byline ytmusic-player-bar")[0]
        .children[1].innerText;
    }
    //Google stopped putting the name of the album at the end of the queue
    //If queue has a name use that
    //else if (document.getElementsByClassName("queue-title ytmusic-player-page")[0].children.length > 0)
    //{
    //	let temp = document.getElementsByClassName("queue-title ytmusic-player-page")[0].children[0].innerText;
    //	//Trim "Album - " from the beginning of the string if it exists
    //	if (temp.indexOf("Album - ") == 0)
    //	{
    //		temp = temp.substring("Album - ".length);
    //	}
    //	return temp;
    //}
    //Otherwise just return it as blank and let the skin handle it
    return "";
  };
  ymInfoHandler.cover = function() {
    let videoID = document.getElementsByClassName("ytp-title")[0].children[1]
      .children[0].href;
    videoID = videoID.substring(videoID.lastIndexOf("=") + 1);
    let cover = document.getElementsByClassName("image ytmusic-player-bar")[0]
      .src;

    //Check if cover is from youtube if it is some work need done first
    if (cover.includes("ytimg")) {
      if (lastImgVideoID !== videoID && videoID !== "ttps://www.") {
        lastImgVideoID = videoID;
        let img = document.createElement("img");
        img.setAttribute(
          "src",
          "https://i.ytimg.com/vi/" + videoID + "/maxresdefault.jpg?"
        );
        img.addEventListener("load", function() {
          if (img.height > 90) {
            currImg =
              "https://i.ytimg.com/vi/" + videoID + "/maxresdefault.jpg?";
          } else {
            currImg = "https://i.ytimg.com/vi/" + videoID + "/mqdefault.jpg?";
          }
        });
        img.addEventListener("error", function() {
          currImg = "https://i.ytimg.com/vi/" + videoID + "/mqdefault.jpg?";
        });
      }
      return currImg;
    }
    cover = cover.substring(0, cover.lastIndexOf("="));
    return cover;
  };
  ymInfoHandler.durationString = function() {
    let durTemp = document.getElementsByClassName(
      "time-info ytmusic-player-bar"
    )[0].innerText;
    return durTemp.substring(durTemp.indexOf(" / ") + " / ".length);
  };
  ymInfoHandler.positionString = function() {
    let posTemp = document.getElementsByClassName(
      "time-info ytmusic-player-bar"
    )[0].innerText;
    return posTemp.substring(0, posTemp.indexOf(" / "));
  };
  ymInfoHandler.volume = function() {
    return document.getElementsByTagName("video")[0].volume;
  };
  ymInfoHandler.rating = function() {
    //Check if thumbs has two paths, if it does not then it is active
    if (
      document
        .getElementsByClassName("middle-controls-buttons")[0]
        .children[0].children[1].getAttribute("aria-pressed") == "true"
    ) {
      return 5;
    }
    if (
      document
        .getElementsByClassName("middle-controls-buttons")[0]
        .children[0].children[0].getAttribute("aria-pressed") == "true"
    ) {
      return 1;
    }

    return 0;
  };
  ymInfoHandler.repeat = function() {
    //Way to check if on repeat
    if (
      document
        .getElementsByTagName("ytmusic-player-bar")[0]
        .getAttribute("repeat-mode_") !== "NONE"
    ) {
      //Way to check if repeat one
      if (
        document
          .getElementsByTagName("ytmusic-player-bar")[0]
          .getAttribute("repeat-mode_") === "ONE"
      ) {
        return 2;
      }
      return 1;
    }
    return 0;
  };
  ymInfoHandler.shuffle = function() {
    //Youtube music does not currently do shuffling really, you just hit the button and it shuffles the queue with no way to tell if already has been
    return 0;
  };

  let ymEventHandler = createNewMusicEventHandler();

  //Define custom check logic to make sure you are not trying to update info when nothing is playing
  ymEventHandler.readyCheck = function() {
    if (
      document.getElementsByTagName("video").length &&
      document.getElementsByClassName("title ytmusic-player-bar")[0].innerText
        .length
    ) {
      return true;
    }
    return false;
  };

  ymEventHandler.playpause = function() {
    document.getElementById("play-pause-button").click();
  };
  ymEventHandler.next = function() {
    document.getElementsByClassName("next-button")[0].click();
  };
  ymEventHandler.previous = function() {
    document.getElementsByClassName("previous-button")[0].click();
  };
  ymEventHandler.progress = function(progress) {
    let loc = document
      .getElementById("progress-bar")
      .children[0].children[0].children[0].getBoundingClientRect();
    progress *= loc.width;

    let a = document.getElementById("progress-bar").children[0].children[0]
      .children[0];
    let e = document.createEvent("MouseEvents");
    e.initMouseEvent(
      "mousedown",
      true,
      true,
      window,
      1,
      screenX + loc.left + progress,
      screenY + loc.top + loc.height / 2,
      loc.left + progress,
      loc.top + loc.height / 2,
      false,
      false,
      false,
      false,
      0,
      null
    );
    a.dispatchEvent(e);
    e.initMouseEvent(
      "mouseup",
      true,
      true,
      window,
      1,
      screenX + loc.left + progress,
      screenY + loc.top + loc.height / 2,
      loc.left + progress,
      loc.top + loc.height / 2,
      false,
      false,
      false,
      false,
      0,
      null
    );
    a.dispatchEvent(e);
  };
  ymEventHandler.volume = function(volume) {
    if (document.getElementsByTagName("video")[0].muted && volume > 0) {
      document.getElementsByTagName("video")[0].muted = false;
    } else if (volume == 0) {
      document.getElementsByTagName("video")[0].muted = true;
    }
    document.getElementsByTagName("video")[0].volume = volume;
  };
  ymEventHandler.repeat = function() {
    document.getElementsByClassName("repeat")[0].click();
  };
  ymEventHandler.shuffle = function() {
    document.getElementsByClassName("shuffle")[0].click();
  };
  ymEventHandler.toggleThumbsUp = function() {
    document
      .getElementsByClassName("middle-controls-buttons")[0]
      .children[0].children[1].click();
  };
  ymEventHandler.toggleThumbsDown = function() {
    document
      .getElementsByClassName("middle-controls-buttons")[0]
      .children[0].children[0].click();
  };
  ymEventHandler.rating = function(rating) {
    //Check if thumbs has two paths, if it does not then it is active
    if (rating > 3) {
      //If thumbs up is not active
      if (
        document
          .getElementsByClassName("middle-controls-buttons")[0]
          .children[0].children[1].getAttribute("aria-pressed") != "true"
      ) {
        document
          .getElementsByClassName("middle-controls-buttons")[0]
          .children[0].children[1].click();
      }
    } else if (rating < 3 && rating > 0) {
      //If thumbs down is not active active
      if (
        document
          .getElementsByClassName("middle-controls-buttons")[0]
          .children[0].children[0].getAttribute("aria-pressed") != "true"
      ) {
        document
          .getElementsByClassName("middle-controls-buttons")[0]
          .children[0].children[0].click();
      }
    } else {
      //If either is pressed undo that
      if (
        document
          .getElementsByClassName("middle-controls-buttons")[0]
          .children[0].children[1].getAttribute("aria-pressed") == "true"
      ) {
        document
          .getElementsByClassName("middle-controls-buttons")[0]
          .children[0].children[1].click();
      }
      if (
        document
          .getElementsByClassName("middle-controls-buttons")[0]
          .children[0].children[0].getAttribute("aria-pressed") == "true"
      ) {
        document
          .getElementsByClassName("middle-controls-buttons")[0]
          .children[0].children[0].click();
      }
    }
  };
}

setup();
init();
