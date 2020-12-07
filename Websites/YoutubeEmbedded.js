//Adds support for the new youtube layout
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize*/

var lastImgVideoID = "";
var lastAlbumVideoID = "";
var currIMG = "";
var currCategory = "";
var wasMadeVisable = false;

function setupEmbedded() {
    var youtubeEmbeddedInfoHandler = createNewMusicInfo();

    youtubeEmbeddedInfoHandler.player = function () {
        return "YouTube Embedded";
    };

    youtubeEmbeddedInfoHandler.readyCheck = function () {
        return (
            document.getElementsByClassName("ytp-title-text").length > 0 &&
            document.getElementsByClassName("ytp-title-text")[0].innerText.length > 0 &&
            (document.getElementsByClassName("html5-video-player")[0].classList.contains("unstarted-mode") ? false : true)
        );
    };

    youtubeEmbeddedInfoHandler.state = function () {
        var state = document.getElementsByClassName("html5-main-video")[0].paused ? 2 : 1;
        if (document.getElementsByClassName("ytp-play-button")[0].getAttribute("aria-label") === null) {
            state = 3;
        }
        //It is possible for the video to be "playing" but not started
        if (state == 1 && document.getElementsByClassName("html5-main-video")[0].played.length <= 0) {
            state = 2;
        }
        return state;
    };
    youtubeEmbeddedInfoHandler.title = function () {
        return document.getElementsByClassName("ytp-title-text")[0].innerText;
    };
    youtubeEmbeddedInfoHandler.artist = function () {
        return document.getElementsByClassName("ytp-title-expanded-title")[0].innerText;
    };
    youtubeEmbeddedInfoHandler.album = function () {
        if (document.getElementsByClassName("ytp-playlist-menu-title")[0].innerText !== "") {
            return document.getElementsByClassName("ytp-playlist-menu-title")[0].innerText;
        }
        return currCategory;
    };
    youtubeEmbeddedInfoHandler.cover = function () {
        var videoID = new URLSearchParams(document.getElementsByClassName("ytp-title-link")[0].search).get("v");

        if (lastImgVideoID !== videoID && videoID !== "ttps://www." && videoID !== null) {
            lastImgVideoID = videoID;
            var img = document.createElement("img");
            img.setAttribute("src", "https://i.ytimg.com/vi/" + videoID + "/hqdefault.jpg?");
            img.addEventListener("load", function () {
                if (img.height > 90) {
                    currIMG = "https://i.ytimg.com/vi/" + videoID + "/hqdefault.jpg?";
                } else {
                    currIMG = "https://i.ytimg.com/vi/" + videoID + "/mqdefault.jpg?";
                }
            });
            img.addEventListener("error", function () {
                currIMG = "https://i.ytimg.com/vi/" + videoID + "/mqdefault.jpg?";
            });
        }

        return currIMG;
    };
    youtubeEmbeddedInfoHandler.durationString = function () {
        return document.getElementsByClassName("ytp-time-duration")[0].innerText;
    };
    youtubeEmbeddedInfoHandler.position = function () {
        return document.getElementsByClassName("html5-main-video")[0].currentTime;
    };
    youtubeEmbeddedInfoHandler.volume = function () {
        return document.getElementsByClassName("html5-main-video")[0].volume;
    };
    youtubeEmbeddedInfoHandler.rating = function () {
        return 0;
    };
    youtubeEmbeddedInfoHandler.repeat = function () {
        if (document.getElementsByClassName("html5-main-video")[0].loop == true) {
            return 2;
        }
        return 0;
    };
    youtubeEmbeddedInfoHandler.shuffle = function () {
        return 1;
    };

    var youtubeEmbeddedEventHandler = createNewMusicEventHandler();

    var playlistClicked = false;

    //Define custom check logic to make sure you are not trying to update info when nothing is playing
    // youtubeEmbeddedEventHandler.readyCheck = null;

    youtubeEmbeddedEventHandler.readyCheck = function () {
        return document.getElementsByClassName("html5-video-player")[0].classList.contains("unstarted-mode") ? false : true;
    };

    youtubeEmbeddedEventHandler.playpause = function () {
        document.getElementsByClassName("ytp-play-button")[0].click();
    };
    //@TODO implement tab handling
    youtubeEmbeddedEventHandler.next = function () {
        if (new URLSearchParams(document.getElementsByClassName("ytp-title-link")[0].search).get("list") !== null) {
            if (playlistClicked == false && document.getElementsByClassName("ytp-playlist-menu-items")[0].children.length == 0) {
                document.getElementsByClassName("ytp-playlist-menu-button")[0].click();
                document.getElementsByClassName("ytp-playlist-menu-button")[0].click();
                playlistClicked = true;
            } else if (playlistClicked == true && document.getElementsByClassName("ytp-playlist-menu-items")[0].children.length == 0) {
                return;
            }
            document
                .getElementsByClassName("ytp-playlist-menu-items")[0]
                .children[Math.floor(Math.random() * document.getElementsByClassName("ytp-playlist-menu-items")[0].children.length)].click();
        } else {
            if (document.getElementsByClassName("ytp-next-button")[0].getAttribute("aria-disabled") !== "true") {
                document.getElementsByClassName("ytp-next-button")[0].click();
            } else {
                return;
            }
        }
    };
    youtubeEmbeddedEventHandler.previous = function () {
        if (document.getElementsByClassName("ytp-prev-button")[0].getAttribute("aria-disabled") !== "true") {
            if (document.getElementsByClassName("html5-main-video")[0].currentTime <= 3) {
                document.getElementsByClassName("ytp-prev-button")[0].click();
            } else {
                document.getElementsByClassName("html5-main-video")[0].currentTime = 0;
            }
        } else if (new URLSearchParams(document.getElementsByClassName("ytp-title-link")[0].search).get("list") !== null) {
            if (document.getElementsByClassName("html5-main-video")[0].currentTime <= 3) {
                if (playlistClicked == false && document.getElementsByClassName("ytp-playlist-menu-items")[0].children.length == 0) {
                    document.getElementsByClassName("ytp-playlist-menu-button")[0].click();
                    document.getElementsByClassName("ytp-playlist-menu-button")[0].click();
                    playlistClicked = true;
                } else if (playlistClicked == true && document.getElementsByClassName("ytp-playlist-menu-items")[0].children.length == 0) {
                    return;
                }
                document
                    .getElementsByClassName("ytp-playlist-menu-items")[0]
                    .children[Math.floor(Math.random() * document.getElementsByClassName("ytp-playlist-menu-items")[0].children.length)].click();
            } else {
                document.getElementsByClassName("html5-main-video")[0].currentTime = 0;
            }
        } else {
            document.getElementsByClassName("html5-main-video")[0].currentTime = 0;
        }
    };
    youtubeEmbeddedEventHandler.progressSeconds = function (position) {
        document.getElementsByClassName("html5-main-video")[0].currentTime = position;
    };
    youtubeEmbeddedEventHandler.volume = function (volume) {
        if (document.getElementsByClassName("html5-main-video")[0].muted && volume > 0) {
            document.getElementsByClassName("html5-main-video")[0].muted = false;
        } else if (volume == 0) {
            document.getElementsByClassName("html5-main-video")[0].muted = true;
        }
        document.getElementsByClassName("html5-main-video")[0].volume = volume;
    };
    youtubeEmbeddedEventHandler.repeat = function () {
        document.getElementsByClassName("html5-main-video")[0].loop = !document.getElementsByClassName("html5-main-video")[0].loop;
    };
    youtubeEmbeddedEventHandler.shuffle = function () {
        return;
    };
    youtubeEmbeddedEventHandler.toggleThumbsUp = function () {
        return;
    };
    youtubeEmbeddedEventHandler.toggleThumbsDown = function () {
        return;
    };
    youtubeEmbeddedEventHandler.rating = function (rating) {
        return;
    };
}

setupEmbedded();
init();
