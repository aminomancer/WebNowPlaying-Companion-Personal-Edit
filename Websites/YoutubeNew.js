//Adds support for the new youtube layout
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize*/

var lastImgVideoID = "";
var lastAlbumVideoID = "";
var currIMG = "";
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

// click thumbs up, thumbs down, share, or save = pass 0, 1, 2, 3
function clickTopLevelButton(menu, i) {
    let topLevelButtons = menu.querySelector("#top-level-buttons");
    if (!topLevelButtons || topLevelButtons.hidden)
        topLevelButtons = menu.querySelector("#top-level-buttons-computed");
    topLevelButtons.children[i]?.click();
}

// check thumbs up, thumbs down, share, or save = pass 0, 1, 2, 3
function checkTopLevelButton(menu, i) {
    let topLevelButtons = menu.querySelector("#top-level-buttons");
    if (!topLevelButtons || topLevelButtons.hidden)
        topLevelButtons = menu.querySelector("#top-level-buttons-computed");
    return topLevelButtons.children[i]?.classList.contains("style-default-active");
}

function setupNew() {
    var youtubeInfoHandler = createNewMusicInfo();

    youtubeInfoHandler.player = function () {
        return "YouTube";
    };

    youtubeInfoHandler.readyCheck = function () {
        let title = document.getElementsByClassName("ytd-video-primary-info-renderer title");
        return title?.length > 0 && title[0].innerText?.length > 0;
    };

    youtubeInfoHandler.state = function () {
        let video = document.getElementsByClassName("html5-main-video")[0];
        let state = video.paused ? 2 : 1;
        if (
            document.getElementsByClassName("ytp-play-button")[0]?.getAttribute("aria-label") ===
            null
        )
            state = 3;
        //It is possible for the video to be "playing" but not started
        if (state == 1 && video.played.length <= 0) state = 2;
        return state;
    };
    youtubeInfoHandler.title = function () {
        return document.getElementsByClassName("ytd-video-primary-info-renderer title")[0]
            ?.innerText;
    };
    youtubeInfoHandler.artist = function () {
        return document.querySelector("#upload-info yt-formatted-string.ytd-channel-name")
            ?.innerText;
    };
    youtubeInfoHandler.album = function () {
        //If using a playlist just use the title of that
        let playlist = document.getElementsByClassName("ytd-playlist-panel-renderer title")[0];
        if (playlist?.innerText !== "") return playlist.innerText;

        //If video has a "Buy or Rent" module use the displayed title & year
        let offer = document.getElementById("offer-module");
        if (offer?.children.length) {
            let info = offer.querySelector("#info"),
                title = offer.querySelector("#title"),
                result,
                year;

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

        //If playing a video with a hashtag use that
        if (document.getElementsByClassName("super-title")[0]?.children.length > 0) {
            return document.getElementsByClassName("super-title")[0].children[0].innerText;
        }

        //Check if the secondary info has a category and is visible
        let info2nd = document.getElementsByClassName(
            "sticky ytd-video-secondary-info-renderer"
        )[0];
        if (info2nd?.innerText.length > 0 && info2nd.children[0]?.children.length > 0) {
            //Return category if visible else
            try {
                let titles = info2nd?.querySelectorAll("#title"),
                    subtitles = info2nd?.querySelectorAll("#subtitle");
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
        //Return no album/last category
        return currCategory;
    };
    youtubeInfoHandler.cover = function () {
        let url = new URL(window.location.href).search;
        let videoID = new URLSearchParams(url).get("v");

        if (lastImgVideoID !== videoID && videoID) {
            lastImgVideoID = videoID;
            const strr = "https://i.ytimg.com/vi/";
            let img = document.createElement("img"),
                qual = "/maxresdefault.jpg?";
            img.setAttribute("src", strr + videoID + qual);
            img.addEventListener("load", function () {
                if (img.height > 90) currIMG = strr + videoID + qual;
                else currIMG = strr + videoID + "/hqdefault.jpg?";
            });
            img.addEventListener("error", function () {
                if (img.src.includes("maxresdefault")) {
                    qual = "/hqdefault.jpg?";
                    currIMG = strr + videoID + qual;
                } else if (img.src.includes("hqdefault")) {
                    qual = "/mqdefault.jpg?";
                    currIMG = strr + videoID + qual;
                } else if (img.src.includes("mqdefault")) {
                    qual = "/maxresdefault.jpg?";
                    currIMG = strr + lastImgVideoID + qual;
                }
                img.setAttribute("src", strr + videoID + qual);
            });
        }

        return currIMG;
    };
    youtubeInfoHandler.durationString = function () {
        return (
            document.getElementsByClassName("ytp-time-duration")[0]?.innerText ||
            fancyTimeFormat(document.getElementsByClassName("html5-main-video")[0])
        );
    };
    youtubeInfoHandler.position = function () {
        return document.getElementsByClassName("html5-main-video")[0].currentTime;
    };
    youtubeInfoHandler.volume = function () {
        return document.getElementsByClassName("html5-main-video")[0].volume;
    };
    youtubeInfoHandler.rating = function () {
        let menu = document.getElementById("menu-container");
        //Check if thumbs button is active
        if (checkTopLevelButton(menu, 0)) return 5; // thumbs up
        if (checkTopLevelButton(menu, 1)) return 1; // thumbs down
        return 0;
    };
    youtubeInfoHandler.repeat = function () {
        if (document.getElementsByClassName("html5-main-video")[0].loop) return 2;
        let menu = document.getElementById("playlist-action-menu");
        if (menu.children?.length > 0) return checkTopLevelButton(menu, 0) ? 1 : 0;
        return 0;
    };
    youtubeInfoHandler.shuffle = function () {
        let menu = document.getElementById("playlist-action-menu");
        if (menu.children.length > 0) {
            return checkTopLevelButton(menu, 1) ? 1 : 0;
        }
        return 0;
    };

    var youtubeEventHandler = createNewMusicEventHandler();

    //Define custom check logic to make sure you are not trying to update info when nothing is playing
    youtubeEventHandler.readyCheck = null;

    youtubeEventHandler.playpause = function () {
        document.getElementsByClassName("ytp-play-button")[0]?.click();
    };

    youtubeEventHandler.next = function () {
        let next = document.getElementsByClassName("ytp-next-button")[0],
            playlist = document.getElementsByClassName("playlist-items")[0];
        if (!document.getElementById("playlist")?.hasAttribute("has-playlist-buttons"))
            next.click();
        else if (currShuffle == 1)
            playlist.children[Math.floor(Math.random() * playlist.children.length)]
                .querySelector("#meta")
                ?.click();
        else if (!playlist.lastElementChild?.hasAttribute("selected"))
            playlist
                .querySelector("#playlist-items[selected]")
                ?.nextSibling?.querySelector("#meta")
                ?.click();
        else if (checkTopLevelButton(document.getElementById("playlist-action-menu"), 0))
            playlist.firstElementChild.querySelector("#meta").click();
        else next.click();
    };
    youtubeEventHandler.previous = function () {
        let video = document.getElementsByClassName("html5-main-video")[0],
            previous = document.getElementsByClassName("ytp-prev-button")[0];
        if (previous?.getAttribute("aria-disabled") == "false") previous.click();
        else if (video.currentTime <= 3) history.back();
        else video.currentTime = 0;
    };
    youtubeEventHandler.progressSeconds = function (position) {
        document.getElementsByClassName("html5-main-video")[0].currentTime = position;
    };
    youtubeEventHandler.volume = function (volume) {
        let video = document.getElementsByClassName("html5-main-video")[0];
        video.muted = volume == 0;
        video.volume = volume;
    };
    youtubeEventHandler.repeat = function () {
        let video = document.getElementsByClassName("html5-main-video")[0];
        let menu = document.getElementById("playlist-action-menu");
        //If no repeat button on the page then use video's loop element to loop the video
        if (
            !document.getElementById("playlist")?.hasAttribute("has-playlist-buttons") ||
            !menu.children.length
        )
            video.loop = !video.loop;
        else {
            //Each if is a different state, first is loop none, second is loop one, last is loop all order triggered is still the usual none->all->one
            if (video.loop) {
                video.loop = false;
                if (checkTopLevelButton(menu, 0)) clickTopLevelButton(menu, 0);
            } else if (checkTopLevelButton(menu, 0)) video.loop = true;
            else clickTopLevelButton(menu, 0);
        }
    };
    youtubeEventHandler.shuffle = function () {
        let menu = document.getElementById("playlist-action-menu");
        if (menu?.children.length > 0) clickTopLevelButton(menu, 1);
    };
    youtubeEventHandler.toggleThumbsUp = function () {
        let menu = document.getElementById("menu-container");
        clickTopLevelButton(menu, 0);
    };
    youtubeEventHandler.toggleThumbsDown = function () {
        let menu = document.getElementById("menu-container");
        clickTopLevelButton(menu, 1);
    };
    youtubeEventHandler.rating = function (rating) {
        let menu = document.getElementById("menu-container");
        clickTopLevelButton(menu, rating < 3 ? 1 : 0);
    };
}
