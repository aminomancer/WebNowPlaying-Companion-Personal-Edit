//Adds support for Netflix
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize*/

function getContext() {
    return document.querySelector("#appMountPoint")?._reactRootContainer?._internalRoot?.current
        ?.child?.memoizedProps?.children?.props?.appContext;
}

function findReact(dom) {
    for (var key in dom) if (key.startsWith("__reactInternalInstance$")) return dom[key].child;
    return null;
}

function getReactFromSelector(selector) {
    const elems = document.querySelectorAll(selector);
    return elems.length > 0 ? findReact(elems[0]) : null;
}

function getRepo(context) {
    return context.getPlayerApp()?.getState()?.videoPlayer?.cadmiumPlayerRepository;
}

function getPlayer() {
    const appContext = getContext();
    if (appContext) {
        const cadmium = getRepo(appContext);
        const sessionId =
            getReactFromSelector(`.watch-video--player-view`)?.memoizedProps?.sessionId;
        return cadmium.getPlayer(sessionId);
    } else return null;
}

function getMetadata() {
    try {
        return Object.values(
            getContext()?.state.playerApp.getState()?.videoPlayer.videoMetadata
        ).find((data) => "_video" in data);
    } catch (e) {
        return null;
    }
}

function getSeasonData() {
    let metadata = getMetadata()?._metadata.video;
    if (metadata) {
        let { seasons } = metadata;
        let getEpisode = (season) =>
            season.episodes.find((episode) => episode.id === metadata.currentEpisode);
        let season = seasons.find(getEpisode);
        return {
            type: metadata.type,
            title: metadata.title,
            episode: getEpisode(season),
            season,
            seasons,
        };
    }
}

function setup() {
    var netflixInfoHandler = createNewMusicInfo();
    netflixInfoHandler.player = function () {
        return "Netflix";
    };
    netflixInfoHandler.readyCheck = function () {
        let player = getPlayer();
        return player && player.isReady() && player.getDuration() > 0;
    };
    netflixInfoHandler.state = function () {
        let player = getPlayer();
        if (!player || !player.isReady()) return 0;
        let state = player.getPaused() ? 2 : 1;
        if (state == 1 && document.querySelector("video").played.length <= 0) state = 2;
        return state;
    };
    netflixInfoHandler.title = function () {
        let data = getSeasonData();
        if (data)
            if (data.type === "show" && data.episode?.title) {
                let { title } = data.episode;
                if (data.season && data.season.episodes.length > 1 && data.season.shortName)
                    title += ` (${data.season.shortName}E${data.episode.seq})`;
                return title;
            } else return data.title;
    };
    netflixInfoHandler.artist = function () {
        let data = getSeasonData();
        if (data && data.type === "show" && data.episode?.title) return data.title;
        else return "Netflix";
    };
    netflixInfoHandler.album = function () {
        let data = getSeasonData();
        if (data && data.type === "show" && data.episode?.title && data.season.longName)
            return data.season.longName;
        else return "Netflix";
    };
    netflixInfoHandler.cover = function () {
        const { artwork, boxart, storyart } = getMetadata()?._metadata.video;
        let art;
        if (artwork?.length > 0) art = artwork;
        else if (storyart?.length > 0) art = storyart;
        else art = boxart;
        if (art?.length > 0)
            return art.reduce((prev, cur) => {
                return prev.w * prev.h > cur.w * cur.h ? prev : cur;
            })?.url;
    };
    netflixInfoHandler.duration = function () {
        return getPlayer().getDuration() / 1000;
    };
    netflixInfoHandler.position = function () {
        return getPlayer().getCurrentTime() / 1000;
    };
    netflixInfoHandler.volume = function () {
        return getPlayer().getVolume();
    };
    netflixInfoHandler.rating = function () {
        let { userRating } = getMetadata()?._metadata.video;
        if (userRating === 2) return 5;
        else return userRating;
    };

    var netflixEventHandler = createNewMusicEventHandler();
    netflixEventHandler.readyCheck = function () {
        let player = getPlayer();
        return player && player.isReady() && player.getDuration() > 0;
    };
    netflixEventHandler.playpause = function () {
        let { player } = getPlayer();
        player.getPaused() ? player.play() : player.pause();
    };
    // netflixEventHandler.next = function () {
    //     getPlayer().playNextEpisode();
    //     // doesn't work for some reason
    // };
    // netflixEventHandler.previous = function () {
    //     let data = getSeasonData();
    //     if (data) {
    //         let { episodes, seq } = data.season;
    //         let eIndex = episodes.findIndex((episode) => episode.id === data.episode.id);
    //         let newId;
    //         if (eIndex > 0) newId = episodes[eIndex - 1].id;
    //         else if (seq > 1) {
    //             let prevEpisodes = data.seasons[seq - 2].episodes;
    //             newId = prevEpisodes[prevEpisodes.length - 1]?.id;
    //         }
    //         return newId;
    //         let sessionId = Object.values(getContext()?.state.playerApp.getState().playerApp.sessionDataBySessionId).find(data => "sessionId" in data).sessionId;
    //     }
    // };
    // netflixEventHandler.progressSeconds = function (position) {
    //     document.getElementsByTagName("audio")[0].currentTime = position;
    // };
    // netflixEventHandler.volume = function (volume) {
    //     if (document.getElementsByTagName("audio")[0].muted && volume > 0) {
    //         document.getElementsByTagName("audio")[0].muted = false;
    //     } else if (volume == 0) {
    //         document.getElementsByTagName("audio")[0].muted = true;
    //     }
    //     document.getElementsByTagName("audio")[0].volume = volume;
    // };
}

setup();
init();
