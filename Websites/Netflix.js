//doesn't work. webextension permission issues sigh
/* import-globals-from ../WebNowPlaying.js */

function waiveXray(obj) {
  if (typeof obj === "object") {
    return "wrappedJSObject" in obj ? obj.wrappedJSObject : obj;
  }
}

function getContext() {
  return waiveXray(window)?.netflix.appContext;
}

function findReact(obj) {
  for (const key in obj) {
    if (key.startsWith("__reactInternalInstance$")) return obj[key];
  }
}

function getReactFromSelector(selector) {
  return findReact(waiveXray(document.querySelector(selector)));
}

function getSessionId() {
  let sessionId = null;
  for (let id of getAPI().videoPlayer.getAllPlayerSessionIds()) {
    if (id.startsWith("watch-")) {
      sessionId = id;
      break;
    }
  }
  return sessionId;
  // const react = getReactFromSelector(`.watch-video`);
  // return react?.return?.memoizedState?.sessionData?.sessionId;
}

function getAPI() {
  return getContext()
    ?.getState()
    .playerApp.getAPI();
}

function getActionCreators() {
  return getContext()
    ?.getPlayerApp()
    .getActionCreators();
}

function getPlayer() {
  return getAPI?.videoPlayer?.getVideoPlayerBySessionId(getSessionId());
  // const appContext = getContext();
  // if (appContext) {
  //   const cadmium = appContext.getPlayerApp()?.getState()?.videoPlayer
  //     ?.cadmiumPlayerRepository;
  //   const player = cadmium.getPlayer(getSessionId());
  //   return player;
  // }
  // return null;
}

function getMetadata() {
  try {
    return Object.values(
      getContext()
        .getPlayerApp()
        .getState()?.videoPlayer.videoMetadata
    ).find(data => "_video" in data);
  } catch (e) {
    return null;
  }
}

function getSeasonData() {
  let metadata = getMetadata()?._metadata.video;
  if (metadata) {
    let { seasons } = metadata;
    let getEpisode = season =>
      [...season.episodes].find(
        episode => episode.id === metadata.currentEpisode
      );
    let season = [...seasons].find(getEpisode);
    return {
      type: metadata.type,
      title: metadata.title,
      episode: getEpisode(season),
      season,
      seasons,
    };
  }
}

function getNavData() {
  let data = getSeasonData();
  if (data) {
    let { episodes, seq } = data.season;
    let seasons = [...data.seasons];
    let eIndex = [...episodes].findIndex(
      episode => episode.id === data.episode.id
    );
    let currId = [...episodes][eIndex].id;
    let prevId, nextId;
    if (eIndex > 0) {
      prevId = [...episodes][eIndex - 1]?.id;
    } else if (seq > 1) {
      let prevEpisodes = [...seasons[seq - 2].episodes];
      prevId = prevEpisodes[prevEpisodes.length - 1]?.id;
    }
    if (eIndex === episodes.length - 1 && seq < seasons.length) {
      nextId = [...seasons[seq].episodes][0]?.id;
    } else {
      nextId = [...episodes][eIndex + 1]?.id;
    }
    return { prevId, currId, nextId };
  }
}

function setup() {
  let netflixInfoHandler = createNewMusicInfo();
  netflixInfoHandler.player = function() {
    return "Netflix";
  };
  netflixInfoHandler.readyCheck = function() {
    let player = getPlayer();
    return player && player.isReady() && player.getDuration() > 0;
  };
  netflixInfoHandler.state = function() {
    let player = getPlayer();
    if (!player || !player.isReady()) return 0;
    let state = player.getPaused() ? 2 : 1;
    if (state == 1 && document.querySelector("video").played.length <= 0) {
      state = 2;
    }
    return state;
  };
  netflixInfoHandler.title = function() {
    let data = getSeasonData();
    if (data) {
      if (data.type === "show" && data.episode?.title) {
        let { title } = data.episode;
        if (
          data.season &&
          [...data.season.episodes].length > 1 &&
          data.season.shortName
        ) {
          title += ` (${data.season.shortName}E${data.episode.seq})`;
        }
        return String(title);
      }
      return String(data.title);
    }
  };
  netflixInfoHandler.artist = function() {
    let data = getSeasonData();
    if (data && data.type === "show" && data.episode?.title) {
      return String(data.title);
    }
    return "Netflix";
  };
  netflixInfoHandler.album = function() {
    let data = getSeasonData();
    if (
      data &&
      data.type === "show" &&
      data.episode?.title &&
      data.season.longName
    ) {
      return String(data.season.longName);
    }
    return "Netflix";
  };
  netflixInfoHandler.cover = function() {
    const { artwork, boxart, storyart } = getMetadata()._metadata.video;
    let art;
    if (artwork?.length > 0) art = artwork;
    else if (storyart?.length > 0) art = storyart;
    else art = boxart;
    art = [...art].reduce((prev, cur) => {
      return prev.w * prev.h > cur.w * cur.h ? prev : cur;
    });
    return String(art?.url) || "";
  };
  netflixInfoHandler.duration = function() {
    return getPlayer().getDuration() / 1000;
  };
  netflixInfoHandler.position = function() {
    return getPlayer().getCurrentTime() / 1000;
  };
  netflixInfoHandler.volume = function() {
    return getPlayer().getVolume();
  };
  netflixInfoHandler.rating = function() {
    let { userRating } = getMetadata()._metadata.video.userRating;
    if (userRating === 2) return 5;
    return Number(userRating || 0);
  };
  netflixInfoHandler.repeat = null;
  netflixInfoHandler.shuffle = null;

  let netflixEventHandler = createNewMusicEventHandler();
  netflixEventHandler.readyCheck = function() {
    let player = getPlayer();
    return player && player.isReady() && player.getDuration() > 0;
  };
  netflixEventHandler.playpause = function() {
    let player = getPlayer();
    player.getPaused() ? player.play() : player.pause();
  };
  netflixEventHandler.next = function() {
    let data = getNavData();
    if (data?.nextId && data?.currId) {
      document.location.href = document.location.href.replace(
        data.currId,
        data.nextId
      );
    }
  };
  netflixEventHandler.previous = function() {
    let data = getNavData();
    if (data?.prevId && data?.currId) {
      document.location.href = document.location.href.replace(
        data.currId,
        data.prevId
      );
    }
  };
  netflixEventHandler.progressSeconds = function(position) {
    getPlayer().seek(position * 1000);
  };
  netflixEventHandler.volume = function(volume) {
    getPlayer().setVolume(volume);
  };
  netflixEventHandler.repeat = null;
  netflixEventHandler.shuffle = null;
  netflixEventHandler.toggleThumbsUp = null;
  netflixEventHandler.toggleThumbsDown = null;
  netflixEventHandler.rating = null;
  // netflixEventHandler.next = function () {
  //     // the simplest way to do this, just go to the very end,
  //     // whereupon netflix will automatically progress to the next episode.
  //     let player = getPlayer();
  //     player.seek(player.getDuration());
  // };
  // netflixEventHandler.previous = function () {
  //     // go back to the beginning of the video. won't actually change titles.
  //     let player = getPlayer();
  //     player.seek(0);
  // };
  // netflixEventHandler.next = function () {
  //     // use netflix's internal API to play the next episode.
  //     // there's no equivalent method to play the previous episode,
  //     // and the internal methods for playing an arbitrary episode are really hard to figure out.
  //     // more importantly, after calling this, netflix doesn't do anything for like 3-4 seconds for some reason.
  //     // so you're just sitting around waiting and you might even wind up hitting it twice and screwing everything up.
  //     // so I'm just doing all of this manually even though it's kinda nasty.
  //     let playbackState = getAPI().getPlaybackStateBySessionId(getSessionId());
  //     getActionCreators().playerPlayNextVideo(playbackState);
  // };
}

setup();
init();
