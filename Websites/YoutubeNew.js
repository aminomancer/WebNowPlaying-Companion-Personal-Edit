//Adds support for the new youtube layout
/*global init createNewMusicInfo createNewMusicEventHandler convertTimeToString capitalize*/

var lastImgVideoID = ""
var lastAlbumVideoID = ""
var currIMG = ""
var currCategory = ""
var wasMadeVisable = false

function setupNew() {
	var youtubeInfoHandler = createNewMusicInfo()

	youtubeInfoHandler.player = function () {
		return "YouTube"
	}

	youtubeInfoHandler.readyCheck = function () {
		return document.getElementsByClassName("ytd-video-primary-info-renderer title").length > 0 &&
			document.getElementsByClassName("ytd-video-primary-info-renderer title")[0].innerText.length > 0
	}

	youtubeInfoHandler.state = function () {
		var state = document.getElementsByClassName("html5-main-video")[0].paused ? 2 : 1
		if (document.getElementsByClassName("ytp-play-button")[0].getAttribute("aria-label") === null) {
			state = 3
		}
		//It is possible for the video to be "playing" but not started
		if (state == 1 && document.getElementsByClassName("html5-main-video")[0].played.length <= 0) {
			state = 2
		}
		return state
	}
	youtubeInfoHandler.title = function () {
		return document.getElementsByClassName("ytd-video-primary-info-renderer title")[0].innerText
	}
	youtubeInfoHandler.artist = function () {
		return document.querySelector(".ytd-video-secondary-info-renderer .ytd-channel-name").innerText
	}
	youtubeInfoHandler.album = function () {

		//If using a playlist just use the title of that
		if (document.getElementsByClassName("ytd-playlist-panel-renderer title")[0].innerText !== "") {
			return document.getElementsByClassName("ytd-playlist-panel-renderer title")[0].innerText
		}

		//If playing a video with a hashtag use that
		if (document.getElementsByClassName("super-title")[0].children.length > 0) {
			return document.getElementsByClassName("super-title")[0].children[0].innerText
		}

		//Check if the secondary info has a category and is visible
		if (document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0].innerText.length > 0 &&
			document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0].children[0].children.length > 0) {
			//Return category if visible else
			var meta0 = document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0].getElementsByTagName('ytd-rich-metadata-renderer')[0].__data.data
			var meta1 = document.getElementsByClassName("sticky ytd-video-secondary-info-renderer")[0].getElementsByTagName('ytd-rich-metadata-renderer')[1].__data.data
			if (meta0.title && meta0.subtitle) {
				currCategory = meta0.title.simpleText + " (" + meta0.subtitle.simpleText + ")"
			} else if (meta0.title) {
				currCategory = meta0.title.simpleText
			} else if (meta1.title && meta1.subtitle) {
				currCategory = meta1.title.simpleText + " (" + meta1.subtitle.simpleText + ")"
			} else if (meta1.title) {
				currCategory = meta1.title.simpleText
			}
			return currCategory
		}

		//If the category is not visable make it
		var videoID = window.location.href.substring(window.location.href.indexOf("v=") + 2, window.location.href.indexOf("v=") + 2 + 11)
		if (lastAlbumVideoID !== videoID) {
			lastAlbumVideoID = videoID
		}
		//Return no album/last category
		return currCategory
	}
	youtubeInfoHandler.cover = function () {
		var videoID = window.location.href.substring(window.location.href.indexOf("v=") + 2, window.location.href.indexOf("v=") + 2 + 11)

		if (lastImgVideoID !== videoID && videoID !== "ttps://www.") {
			lastImgVideoID = videoID
			var img = document.createElement('img')
			img.setAttribute('src', "https://i.ytimg.com/vi/" + videoID + "/hqdefault.jpg?")
			img.addEventListener('load', function () {
				if (img.height > 90) {
					currIMG = "https://i.ytimg.com/vi/" + videoID + "/hqdefault.jpg?"
				}
				else {
					currIMG = "https://i.ytimg.com/vi/" + videoID + "/mqdefault.jpg?"
				}
			})
			img.addEventListener('error', function () {
				currIMG = "https://i.ytimg.com/vi/" + videoID + "/mqdefault.jpg?"
			})
		}

		return currIMG
	}
	youtubeInfoHandler.durationString = function () {
		return document.getElementsByClassName("ytp-time-duration")[0].innerText
	}
	youtubeInfoHandler.position = function () {
		return document.getElementsByClassName("html5-main-video")[0].currentTime
	}
	youtubeInfoHandler.volume = function () {
		return document.getElementsByClassName("html5-main-video")[0].volume
	}
	youtubeInfoHandler.rating = function () {
		//Check if thumbs button is active
		if (document.getElementById("menu-container").children[0].children[0].children[0].children[0].children[0].children[0].children[0].getAttribute("aria-pressed") == "true") {
			return 5
		}
		if (document.getElementById("menu-container").children[0].children[0].children[0].children[1].children[0].children[0].children[0].getAttribute("aria-pressed") == "true") {
			return 1
		}
		return 0
	}
	youtubeInfoHandler.repeat = function () {
		if (document.getElementsByClassName("html5-main-video")[0].loop == true) {
			return 2
		}
		if (document.getElementById("playlist-actions").children[0].children[0].children.length > 0) {
			return document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[0].getAttribute("class").includes("active") ? 1 : 0
		}
		return 0
	}
	youtubeInfoHandler.shuffle = function () {
		if (document.getElementById("playlist-actions").children[0].children[0].children.length > 0) {
			return document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[1].getAttribute("class").includes("active") ? 1 : 0
		}
		return 0
	}


	var youtubeEventHandler = createNewMusicEventHandler()

	//Define custom check logic to make sure you are not trying to update info when nothing is playing
	youtubeEventHandler.readyCheck = null

	youtubeEventHandler.playpause = function () {
		document.getElementsByClassName("ytp-play-button")[0].click()
	}
	//@TODO implement tab handling
	youtubeEventHandler.next = function () {
		if (document.getElementById('playlist') === null || !document.getElementById('playlist').hasAttribute('has-playlist-buttons')) {
			document.getElementsByClassName("ytp-next-button")[0].click()
		} else if (document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[1].getAttribute("class").includes("active")) {
			document.getElementsByClassName('playlist-items')[0].children[Math.floor(Math.random() * document.getElementsByClassName('playlist-items')[0].children.length)].querySelector('#meta').click()
		} else {
			if (!document.getElementsByClassName('playlist-items')[0].lastChild.hasAttribute('selected')) {
				document.getElementsByClassName('playlist-items')[0].querySelector('#playlist-items[selected]').nextSibling.querySelector('#meta').click()
			} else {
				if (document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[0].getAttribute("class").includes("active")) {
					document.getElementsByClassName('playlist-items')[0].children[0].querySelector('#meta').click()
				} else {
					document.getElementsByClassName("ytp-next-button")[0].click()
				}
			}
		}
	}
	youtubeEventHandler.previous = function () {
		if (document.getElementsByClassName("ytp-prev-button")[0].getAttribute("aria-disabled") == "false") {
			document.getElementsByClassName("ytp-prev-button")[0].click()
		} else {
			if (document.getElementsByClassName("html5-main-video")[0].currentTime <= 3) {
				history.back()
			} else {
				document.getElementsByClassName("html5-main-video")[0].currentTime = 0
			}
		}
	}
	youtubeEventHandler.progressSeconds = function (position) {
		document.getElementsByClassName("html5-main-video")[0].currentTime = position
	}
	youtubeEventHandler.volume = function (volume) {
		if (document.getElementsByClassName("html5-main-video")[0].muted && volume > 0) {
			document.getElementsByClassName("html5-main-video")[0].muted = false
		}
		else if (volume == 0) {
			document.getElementsByClassName("html5-main-video")[0].muted = true
		}
		document.getElementsByClassName("html5-main-video")[0].volume = volume
	}
	youtubeEventHandler.repeat = function () {
		//If no repeat button on the page then use video's loop element to loop the video
		if (document.getElementById('playlist') === null || !document.getElementById('playlist').hasAttribute('has-playlist-buttons')) {
			document.getElementsByClassName("html5-main-video")[0].loop = !document.getElementsByClassName("html5-main-video")[0].loop
		}
		else {
			//Each if is a different state, first is loop none, second is loop one, last is loop all order triggered is still the usual none->all->one
			if (document.getElementsByClassName("html5-main-video")[0].loop == true) {
				document.getElementsByClassName("html5-main-video")[0].loop = false
				if (document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[0].getAttribute("class").includes("active")) {
					document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[0].click()
				}
			}
			else if (document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[0].getAttribute("class").includes("active")) {
				document.getElementsByClassName("html5-main-video")[0].loop = true
			}
			else {
				document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[0].click()
			}
		}
	}
	youtubeEventHandler.shuffle = function () {
		if (document.getElementById("playlist-actions") !== null) {
			document.getElementById("playlist-actions").children[0].children[0].children[0].children[0].children[1].click()
		}
	}
	youtubeEventHandler.toggleThumbsUp = function () {
		document.getElementById("menu-container").children[0].children[0].children[0].children[0].children[0].children[0].click()
	}
	youtubeEventHandler.toggleThumbsDown = function () {
		document.getElementById("menu-container").children[0].children[0].children[0].children[1].children[0].children[0].click()
	}
	youtubeEventHandler.rating = function (rating) {
		if (rating > 3) {
			document.getElementById('menu-container').getElementsByTagName('ytd-toggle-button-renderer')[0].click()
		}
		else if (rating < 3) {
			document.getElementById('menu-container').getElementsByTagName('ytd-toggle-button-renderer')[1].click()
		}
	}
}
