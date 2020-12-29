//Adds support for the new youtube layout
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize*/

var lastImgVideoID = "";
var lastAlbumVideoID = "";
var currIMG = "";
var currCategory = "";
var wasMadeVisable = false;

function setupNew() {
    var youtubeInfoHandler = createNewMusicInfo();

    youtubeInfoHandler.player = function () {
        return "YouTube";
    };

    youtubeInfoHandler.readyCheck = function () {
        return (
            document.getElementsByClassName("ytd-video-primary-info-renderer title")?.length > 0 &&
            document.getElementsByClassName("ytd-video-primary-info-renderer title")[0].innerText?.length > 0
        );
    };

    youtubeInfoHandler.state = function () {
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
    youtubeInfoHandler.title = function () {
        return document.getElementsByClassName("ytd-video-primary-info-renderer title")[0].innerText;
    };
    youtubeInfoHandler.artist = function () {
        return document.querySelector("#upload-info yt-formatted-string.ytd-channel-name").innerText;
    };
    youtubeInfoHandler.album = function () {
        //If using a playlist just use the title of that
        if (document.getElementsByClassName("ytd-playlist-panel-renderer title")[0].innerText !== "") {
            return document.getElementsByClassName("ytd-playlist-panel-renderer title")[0].innerText;
        }

        //If video has a "Buy or Rent" module use the displayed title & year
        let offer = document.getElementById("offer-module");
        if (offer?.children.length) {
            let info = offer.querySelector("#info"),
                title = offer.querySelector("#title"),
                result,
                year;

            if (title?.innerText.length > 0) {
                if (info) {
                    let released = document.evaluate("//yt-formatted-string[text()='Released']", info, null, XPathResult.ANY_TYPE, result).iterateNext();
                    let module = released?.parentElement;
                    year = module?.querySelector("[title]");
                    year?.innerText?.length > 0 ? (currCategory = title?.innerText + " (" + year?.innerText + ")") : (currCategory = title?.innerText);
                } else {
                    currCategory = title?.innerText;
                }
                return currCategory;
            }
        }

        //If playing a video with a hashtag use that
        if (document.getElementsByClassName("super-title")[0].children.length > 0) {
            return document.getElementsByClassName("super-title")[0].children[0].innerText;
        }

        //Check if the secondary info has a category and is visible
        if (
            document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0].innerText.length > 0 &&
            document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0].children[0].children.length > 0
        ) {
            //Return category if visible else
            try {
                var title = document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0]?.querySelectorAll("#title")[0];
                var subtitle = document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0]?.querySelectorAll("#subtitle")[0];
                var category = document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0]?.querySelectorAll("#title")[1];
                var catsub = document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0]?.querySelectorAll("#subtitle")[1];
            } catch (e) {
                return currCategory;
            }
            if (title?.hidden == false && subtitle?.hidden == false) {
                currCategory = title?.innerText + " (" + subtitle?.innerText + ")";
            } else if (title?.hidden == false) {
                currCategory = title?.innerText;
            } else if (category?.hidden == false && catsub?.hidden == false) {
                currCategory = category?.innerText + " (" + catsub?.innerText + ")";
            } else if (category?.hidden == false) {
                currCategory = category?.innerText;
            }
            return currCategory;
        }
        //Return no album/last category
        return currCategory;
    };
    youtubeInfoHandler.cover = function () {
        var url = new URL(window.location.href).search;
        var videoID = new URLSearchParams(url).get("v");

        if (lastImgVideoID !== videoID && videoID) {
            lastImgVideoID = videoID;
            const strr = "https://i.ytimg.com/vi/";
            var img = document.createElement("img"),
                qual = "/maxresdefault.jpg?";
            img.setAttribute("src", strr + videoID + qual);
            img.addEventListener("load", function () {
                if (img.height > 90) {
                    currIMG = strr + videoID + qual;
                } else {
                    currIMG = strr + videoID + "/hqdefault.jpg?";
                }
            });
            img.addEventListener("error", function () {
                if (img.src.includes("maxresdefault")) {
                    qual = "/hqdefault.jpg?";
                } else if (img.src.includes("hqdefault")) {
                    qual = "/mqdefault.jpg?";
                } else if (img.src.includes("mqdefault")) {
                    qual = "/maxresdefault.jpg?";
                    currIMG = strr + lastImgVideoID + qual;
                }
                currIMG = strr + videoID + qual;
                img.setAttribute("src", strr + videoID + qual);
            });
        }

        return currIMG;
    };
    youtubeInfoHandler.durationString = function () {
        return document.getElementsByClassName("ytp-time-duration")[0].innerText;
    };
    youtubeInfoHandler.position = function () {
        return document.getElementsByClassName("html5-main-video")[0].currentTime;
    };
    youtubeInfoHandler.volume = function () {
        return document.getElementsByClassName("html5-main-video")[0].volume;
    };
    youtubeInfoHandler.rating = function () {
        //Check if thumbs button is active
        if (document.getElementById("menu-container").getElementsByTagName("button")[0]?.getAttribute("aria-pressed") == "true") {
            return 5;
        }
        if (document.getElementById("menu-container").getElementsByTagName("button")[1]?.getAttribute("aria-pressed") == "true") {
            return 1;
        }
        return 0;
    };
    youtubeInfoHandler.repeat = function () {
        if (document.getElementsByClassName("html5-main-video")[0].loop == true) {
            return 2;
        }
        if (document.getElementById("playlist-action-menu").children?.length > 0) {
            return document.getElementById("playlist-action-menu").children[0].children[0].children[0].getAttribute("class")?.includes("active") ? 1 : 0;
        }
        return 0;
    };
    youtubeInfoHandler.shuffle = function () {
        if (document.getElementById("playlist-action-menu").children.length > 0) {
            return document.getElementById("playlist-action-menu").children[0].children[0].children[1].getAttribute("class")?.includes("active") ? 1 : 0;
        }
        return 0;
    };

    var youtubeEventHandler = createNewMusicEventHandler();

    //Define custom check logic to make sure you are not trying to update info when nothing is playing
    youtubeEventHandler.readyCheck = null;

    youtubeEventHandler.playpause = function () {
        document.getElementsByClassName("ytp-play-button")[0]?.click();
    };
    //@TODO implement tab handling
    youtubeEventHandler.next = function () {
        if (document.getElementById("playlist") === null || !document.getElementById("playlist").hasAttribute("has-playlist-buttons")) {
            document.getElementsByClassName("ytp-next-button")[0].click();
        } else if (currShuffle == 1) {
            document
                .getElementsByClassName("playlist-items")[0]
                .children[Math.floor(Math.random() * document.getElementsByClassName("playlist-items")[0].children.length)].querySelector("#meta")
                ?.click();
        } else {
            if (!document.getElementsByClassName("playlist-items")[0].lastChild.hasAttribute("selected")) {
                document.getElementsByClassName("playlist-items")[0].querySelector("#playlist-items[selected]").nextSibling.querySelector("#meta")?.click();
            } else {
                if (document.getElementById("playlist-action-menu").children[0].children[0].children[0].getAttribute("class")?.includes("active")) {
                    document.getElementsByClassName("playlist-items")[0].children[0].querySelector("#meta")?.click();
                } else {
                    document.getElementsByClassName("ytp-next-button")[0].click();
                }
            }
        }
    };
    youtubeEventHandler.previous = function () {
        if (document.getElementsByClassName("ytp-prev-button")[0]?.getAttribute("aria-disabled") == "false") {
            document.getElementsByClassName("ytp-prev-button")[0].click();
        } else {
            if (document.getElementsByClassName("html5-main-video")[0].currentTime <= 3) {
                history.back();
            } else {
                document.getElementsByClassName("html5-main-video")[0].currentTime = 0;
            }
        }
    };
    youtubeEventHandler.progressSeconds = function (position) {
        document.getElementsByClassName("html5-main-video")[0].currentTime = position;
    };
    youtubeEventHandler.volume = function (volume) {
        if (document.getElementsByClassName("html5-main-video")[0].muted && volume > 0) {
            document.getElementsByClassName("html5-main-video")[0].muted = false;
        } else if (volume == 0) {
            document.getElementsByClassName("html5-main-video")[0].muted = true;
        }
        document.getElementsByClassName("html5-main-video")[0].volume = volume;
    };
    youtubeEventHandler.repeat = function () {
        //If no repeat button on the page then use video's loop element to loop the video
        if (document.getElementById("playlist") === null || !document.getElementById("playlist").hasAttribute("has-playlist-buttons")) {
            document.getElementsByClassName("html5-main-video")[0].loop = !document.getElementsByClassName("html5-main-video")[0].loop;
        } else {
            //Each if is a different state, first is loop none, second is loop one, last is loop all order triggered is still the usual none->all->one
            if (document.getElementsByClassName("html5-main-video")[0].loop == true) {
                document.getElementsByClassName("html5-main-video")[0].loop = false;
                if (document.getElementById("playlist-action-menu").children[0].children[0].children[0].getAttribute("class")?.includes("active")) {
                    document.getElementById("playlist-action-menu").children[0].children[0].children[0].click();
                }
            } else if (document.getElementById("playlist-action-menu").children[0].children[0].children[0].getAttribute("class")?.includes("active")) {
                document.getElementsByClassName("html5-main-video")[0].loop = true;
            } else {
                document.getElementById("playlist-action-menu").children[0].children[0].children[0]?.click();
            }
        }
    };
    youtubeEventHandler.shuffle = function () {
        if (document.getElementById("playlist-action-menu").children.length > 0) {
            document.getElementById("playlist-action-menu").children[0].children[0].children[1]?.click();
        }
    };
    youtubeEventHandler.toggleThumbsUp = function () {
        document.getElementById("menu-container").getElementsByTagName("button")[0]?.click();
    };
    youtubeEventHandler.toggleThumbsDown = function () {
        document.getElementById("menu-container").getElementsByTagName("button")[1]?.click();
    };
    youtubeEventHandler.rating = function (rating) {
        if (rating > 3) {
            document.getElementById("menu-container").getElementsByTagName("button")[0]?.click();
        } else if (rating < 3) {
            document.getElementById("menu-container").getElementsByTagName("button")[1]?.click();
        }
    };
}
