//doesn't work. webextension permission issues sigh
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize*/

function getContext() {
    return window.wrappedJSObject.netflix.appContext;
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
    netflixInfoHandler.repeat = null;
    netflixInfoHandler.shuffle = null;

    var netflixEventHandler = createNewMusicEventHandler();
    netflixEventHandler.readyCheck = function () {
        let player = getPlayer();
        return player && player.isReady() && player.getDuration() > 0;
    };
    netflixEventHandler.playpause = function () {
        let player = getPlayer();
        player.getPaused() ? player.play() : player.pause();
    };
    netflixEventHandler.next = function () {
        let player = getPlayer();
        player.seek(player.getDuration());
    };
    netflixEventHandler.previous = function () {
        let player = getPlayer();
        player.seek(0);
    };
    netflixEventHandler.progressSeconds = function (position) {
        let player = getPlayer();
        player.seek(position);
        // player.seek(player.getCurrentTime() + position);
    };
    netflixEventHandler.volume = function (volume) {
        let player = getPlayer();
        player.setVolume(volume);
    };
    netflixEventHandler.repeat = null;
    netflixEventHandler.shuffle = null;
    netflixEventHandler.toggleThumbsUp = null;
    netflixEventHandler.toggleThumbsDown = null;
    netflixEventHandler.rating = null;
}

setup();
init();
