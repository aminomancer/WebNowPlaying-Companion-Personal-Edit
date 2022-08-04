var currTitle,
  currArtist,
  currAlbum,
  currCover,
  currPos,
  currDur,
  currVolume,
  currRating,
  currRepeat,
  currShuffle,
  currState,
  //Always make sure this is set
  currPlayer,
  currTrackID,
  currArtistID,
  currAlbumID,
  ws,
  connected = false,
  reconnect,
  sendData,
  musicEvents,
  musicInfo;

/*
ooooo   ooooo oooooooooooo ooooo        ooooooooo.   oooooooooooo ooooooooo.    .oooooo..o
`888'   `888' `888'     `8 `888'        `888   `Y88. `888'     `8 `888   `Y88. d8P'    `Y8
 888     888   888          888          888   .d88'  888          888   .d88' Y88bo.
 888ooooo888   888oooo8     888          888ooo88P'   888oooo8     888ooo88P'   `"Y8888o.
 888     888   888    "     888          888          888    "     888`88b.         `"Y88b
 888     888   888       o  888       o  888          888       o  888  `88b.  oo     .d8P
o888o   o888o o888ooooood8 o888ooooood8 o888o        o888ooooood8 o888o  o888o 8""88888P'
*/
function pad(number, length) {
  let str = String(number);
  while (str.length < length) str = "0" + str;
  return str;
}

//Convert seconds to a time string acceptable to Rainmeter
function convertTimeToString(timeInSeconds) {
  let timeInMinutes = parseInt(timeInSeconds / 60);
  if (timeInMinutes < 60) return timeInMinutes + ":" + pad(parseInt(timeInSeconds % 60), 2);
  return (
    parseInt(timeInMinutes / 60) +
    ":" +
    pad(parseInt(timeInMinutes % 60), 2) +
    ":" +
    pad(parseInt(timeInSeconds % 60), 2)
  );
}

// A fallback currently used as a fallback on YouTube.
function fancyTimeFormat(time) {
  // Hours, minutes and seconds
  let days = ~~(time / 86400);
  let hrs = ~~((time % 86400) / 3600);
  let mins = ~~((time % 3600) / 60);
  let secs = ~~time % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  let ret = "";
  if (days > 0) ret += "" + days + ":" + (hrs < 10 ? "0" : "");
  if (hrs > 0) ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  if (mins > 0) ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  else ret += "" + 0 + ":";
  ret += "" + secs;
  return ret;
}

//Convert every words to start with capital (Note: Does NOT ignore words that should not be)
function capitalize(str) {
  str = str.replace(/-/g, " ");
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/*
  .oooooo.   oooooooooo.     oooo oooooooooooo   .oooooo.   ooooooooooooo  .oooooo..o
 d8P'  `Y8b  `888'   `Y8b    `888 `888'     `8  d8P'  `Y8b  8'   888   `8 d8P'    `Y8
888      888  888     888     888  888         888               888      Y88bo.
888      888  888oooo888'     888  888oooo8    888               888       `"Y8888o.
888      888  888    `88b     888  888    "    888               888           `"Y88b
`88b    d88'  888    .88P     888  888       o `88b    ooo       888      oo     .d8P
 `Y8bood8P'  o888bood8P'  .o. 88P o888ooooood8  `Y8bood8P'      o888o     8""88888P'
                          `Y888P
*/
//Use this object to define custom event logic
function createNewMusicEventHandler() {
  musicEvents = {
    readyCheck: null,
    playpause: null,
    next: null,
    previous: null,
    progress: null,
    progressSeconds: null,
    volume: null,
    repeat: null,
    shuffle: null,
    toggleThumbsUp: null,
    toggleThumbsDown: null,
    rating: null,
  };
  return musicEvents;
}

//Use this object to define custom logic to retrieve data
function createNewMusicInfo() {
  musicInfo = {
    //Mandatory, just give the player name
    player: null,
    //Check player is ready to start doing info checks. ie. it is fully loaded and has the song title
    //While false no other info checks will be called
    readyCheck: null,
    state: null,
    title: null,
    artist: null,
    album: null,
    cover: null,
    duration: null,
    position: null,
    durationString: null,
    positionString: null,
    volume: null,
    rating: null,
    repeat: null,
    shuffle: null,
    //Optional, only use if more data parsing needed in the Rainmeter plugin
    trackID: null,
    artistID: null,
    albumID: null,
  };
  return musicInfo;
}

/*
ooooo     ooo ooooooooo.   oooooooooo.         .o.       ooooooooooooo oooooooooooo ooooooooo.
`888'     `8' `888   `Y88. `888'   `Y8b       .888.      8'   888   `8 `888'     `8 `888   `Y88.
 888       8   888   .d88'  888      888     .8"888.          888       888          888   .d88'
 888       8   888ooo88P'   888      888    .8' `888.         888       888oooo8     888ooo88P'
 888       8   888          888      888   .88ooo8888.        888       888    "     888`88b.
 `88.    .8'   888          888     d88'  .8'     `888.       888       888       o  888  `88b.
   `YbodP'    o888o        o888bood8P'   o88o     o8888o     o888o     o888ooooood8 o888o  o888o
*/
function updateInfo() {
  //Try catch for each updater to make sure info is fail safe
  //This would be a lot cleaner if javascript had nice things like enums, then I could just foreach this
  //UPDATE STATE
  if (musicInfo.readyCheck === null || musicInfo.readyCheck()) {
    let temp;
    try {
      if (musicInfo.state !== null) {
        temp = musicInfo.state();
        if (currState !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("STATE:" + temp);
          currState = temp;
          if (currState > 0) chrome.runtime.sendMessage({ method: "open" });
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating state for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE TITLE
    try {
      if (musicInfo.title !== null) {
        temp = musicInfo.title();
        if (currTitle !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("TITLE:" + temp);
          currTitle = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating title for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE ARTIST
    try {
      if (musicInfo.artist !== null) {
        temp = musicInfo.artist();
        if (currArtist !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("ARTIST:" + temp);
          currArtist = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating artist for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE ALBUM
    try {
      if (musicInfo.album !== null) {
        temp = musicInfo.album();
        if (currAlbum !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("ALBUM:" + temp);
          currAlbum = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating album for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE COVER
    try {
      if (musicInfo.cover !== null) {
        temp = musicInfo.cover();
        if (currCover !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("COVER:" + temp.replace("https://", "http://"));
          currCover = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating cover for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE DURATION
    try {
      if (musicInfo.durationString !== null) {
        temp = musicInfo.durationString();
        if (currDur !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("DURATION:" + temp);
          currDur = temp;
        }
      } else if (musicInfo.duration !== null) {
        temp = musicInfo.duration();
        if (currDur !== temp && temp !== null && !isNaN(temp)) {
          ws.send("DURATION:" + convertTimeToString(temp));
          currDur = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating duration for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE POSITION
    try {
      if (musicInfo.positionString !== null) {
        temp = musicInfo.positionString();
        if (currPos !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("POSITION:" + temp);
          currPos = temp;
        }
      } else if (musicInfo.position !== null) {
        temp = musicInfo.position();
        if (currPos !== temp && temp !== null && !isNaN(temp)) {
          ws.send("POSITION:" + convertTimeToString(temp));
          currPos = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating position for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE VOLUME
    try {
      if (musicInfo.volume !== null) {
        temp = parseFloat(musicInfo.volume()) * 100;
        if (currVolume !== temp && temp !== null && !isNaN(temp)) {
          ws.send("VOLUME:" + temp);
          currVolume = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating volume for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE RATING
    try {
      if (musicInfo.rating !== null) {
        temp = musicInfo.rating();
        if (currRating !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("RATING:" + temp);
          currRating = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating rating for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE REPEAT
    try {
      if (musicInfo.repeat !== null) {
        temp = musicInfo.repeat();
        if (currRepeat !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("REPEAT:" + temp);
          currRepeat = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating repeat for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE SHUFFLE
    try {
      if (musicInfo.shuffle !== null) {
        temp = musicInfo.shuffle();
        if (currShuffle !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("SHUFFLE:" + temp);
          currShuffle = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating shuffle for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }

    //OPTIONAL ID UPDATERS FOR PLUGIN USE
    //UPDATE TRACKID
    try {
      if (musicInfo.trackID !== null) {
        temp = musicInfo.trackID();
        if (currShuffle !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("TRACKID:" + temp);
          currShuffle = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating trackID for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE ARTISTID
    try {
      if (musicInfo.artistID !== null) {
        temp = musicInfo.artistID();
        if (currShuffle !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("ARTISTID:" + temp);
          currShuffle = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating artistID for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
    //UPDATE ALBUMID
    try {
      if (musicInfo.albumID !== null) {
        temp = musicInfo.albumID();
        if (currShuffle !== temp && temp !== null && ws.readyState == WebSocket.OPEN) {
          ws.send("ALBUMID:" + temp);
          currShuffle = temp;
        }
      }
    } catch (e) {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send("Error:Error updating albumID for " + musicInfo.player());
        ws.send("ErrorD:" + e);
      }
    }
  } else {
    if (currState !== 0) {
      ws.send("STATE:" + 0);
      currState = 0;
    }
  }
}

/*
oooooooooooo oooooo     oooo oooooooooooo ooooo      ooo ooooooooooooo  .oooooo..o
`888'     `8  `888.     .8'  `888'     `8 `888b.     `8' 8'   888   `8 d8P'    `Y8
 888           `888.   .8'    888          8 `88b.    8       888      Y88bo.
 888oooo8       `888. .8'     888oooo8     8   `88b.  8       888       `"Y8888o.
 888    "        `888.8'      888    "     8     `88b.8       888           `"Y88b
 888       o      `888'       888       o  8       `888       888      oo     .d8P
o888ooooood8       `8'       o888ooooood8 o8o        `8      o888o     8""88888P'
*/
function fireEvent(event) {
  try {
    if (musicEvents.readyCheck === null || musicEvents.readyCheck()) {
      let type = event.data.toLowerCase();

      if (type == "playpause" && musicEvents.playpause !== null) musicEvents.playpause();
      else if (type == "next" && musicEvents.next !== null) musicEvents.next();
      else if (type == "previous" && musicEvents.previous !== null) musicEvents.previous();
      else if (type.includes("setprogress ") || type.includes("setposition ")) {
        if (musicEvents.progress !== null) {
          //+9 because "progress " is 9 chars
          let progress = type.substring(type.indexOf("progress ") + 9);
          //Goto the : at the end of the command, this command is now a compound command the first half is seconds the second is percent
          progress = parseFloat(progress.substring(0, progress.indexOf(":")));
          musicEvents.progress(progress);
        } else if (musicEvents.progressSeconds !== null) {
          //+9 because "position " is 9 chars
          let position = type.substring(type.indexOf("position ") + 9);
          //Goto the : at the end of the command, this command is now a compound command the first half is seconds the second is percent
          position = parseInt(position.substring(0, position.indexOf(":")));
          musicEvents.progressSeconds(position);
        } else return;
      } else if (type.includes("setvolume ") && musicEvents.volume !== null) {
        //+7 because "volume " is 7 chars
        let volume = parseInt(type.substring(type.indexOf("volume ") + 7)) / 100;
        musicEvents.volume(volume);
      } else if (type == "repeat" && musicEvents.repeat !== null) musicEvents.repeat();
      else if (type == "shuffle" && musicEvents.shuffle !== null) musicEvents.shuffle();
      else if (type == "togglethumbsup" && musicEvents.toggleThumbsUp !== null) {
        musicEvents.toggleThumbsUp();
      } else if (type == "togglethumbsdown" && musicEvents.toggleThumbsDown !== null) {
        musicEvents.toggleThumbsDown();
      } else if (type == "rating " && musicEvents.rating !== null) musicEvents.rating();
      else return;

      if (connected) updateInfo();
    }
  } catch (e) {
    ws.send("Error:Error sending event to " + musicInfo.player);
    ws.send("ErrorD:" + e);
    throw e;
  }
}

/*
 .oooooo..o oooooooooooo ooooooooooooo ooooo     ooo ooooooooo.
d8P'    `Y8 `888'     `8 8'   888   `8 `888'     `8' `888   `Y88.
Y88bo.       888              888       888       8   888   .d88'
 `"Y8888o.   888oooo8         888       888       8   888ooo88P'
     `"Y88b  888    "         888       888       8   888
oo     .d8P  888       o      888       `88.    .8'   888
8""88888P'  o888ooooood8     o888o        `YbodP'    o888o
*/

function init() {
  ws = new WebSocket("ws://127.0.0.1:8974/");
  ws.onopen = function () {
    connected = true;
    currPlayer = musicInfo.player();
    ws.send("PLAYER:" + currPlayer);
    sendData = setInterval(() => updateInfo(), 50);
    if (!(currState && currState > 0)) chrome.runtime.sendMessage({ method: "closed" });
  };
  ws.onclose = function () {
    connected = false;
    chrome.runtime.sendMessage({ method: "closed" });
    clearInterval(sendData);
    reconnect = setTimeout(() => init(), 5000);
  };
  ws.onmessage = function (event) {
    try {
      fireEvent(event);
    } catch (e) {
      ws.send("Error:" + e);
      throw e;
    }
  };
  ws.onerror = function (event) {
    if (typeof event.data != "undefined") console.error("Websocket Error:" + event.data);
  };

  currPlayer = null;

  currTitle = null;
  currArtist = null;
  currAlbum = null;
  currCover = null;
  currPos = null;
  currDur = null;
  currVolume = null;
  currRating = null;
  currRepeat = null;
  currShuffle = null;
  currState = null;

  currTrackID = null;
  currArtistID = null;
  currAlbumID = null;
}

window.onbeforeunload = function () {
  ws.onclose = function () {}; // disable onclose handler first
  ws.close();
  chrome.runtime.sendMessage({ method: "closed" });
};
