var oldTitle;
var oldArtist;
var oldAlbum;
var oldAlbumArt;
var oldPos;
var oldDur;
var oldVolume;
var oldLiked;
var oldRepeat;
var oldShuffle;
var oldState;

var ws;
var connected = false;
var reconnect;
var sendData;

function pad(number, length) {
	var str = number + "";
	while (str.length < length) {
		str = "0" + str;
	}
	return str;
}

function open() {
	try {
		var url = "ws://127.0.0.1:8974/";
		ws = new WebSocket(url);
		ws.onopen = onOpen;
		ws.onclose = onClose;
		ws.onmessage = onMessage;
		ws.onerror = onError;

		oldTitle = null;
		oldArtist = null;
		oldAlbum = null;
		oldAlbumArt = null;
		oldPos = null;
		oldDur = null;
		oldVolume = null;
		oldLiked = null;
		oldRepeat = null;
		oldShuffle = null;
		oldState = null;
	}
	catch (error) {
		console.log("Error:" + error);
	}
}

var onOpen = function() {
	connected = true;
	ws.send("PLAYER:Twitch");
	//@TODO Possibly send all know data right away on open
	sendData = setInterval(function() {
		dataCheck();
	}, 50);
};

var onClose = function() {
	connected = false;
	clearInterval(sendData);
	reconnect = setTimeout(function() {
		open();
	}, 5000);
};

var onMessage = function(event) {
	try {
		if (event.data.toLowerCase() == "playpause") {
			document.getElementsByClassName("js-control-playpause-button")[0].click();
		}
		else if (event.data.toLowerCase().includes("setposition ")) {
			var position = event.data.toLowerCase();
			//+9 because "position " is 9 chars
			position = position.substring(position.indexOf("position ") + 9);
			//Goto the : at the end of the command, this command is now a compound command the first half is seconds the second is percent
			position = parseInt(position.substring(0, position.indexOf(":")));

			document.getElementsByClassName("player-video")[0].children[0].currentTime = position;
		}
		else if (event.data.toLowerCase().includes("setvolume ")) {
			var volume = event.data.toLowerCase();
			//+7 because "volume " is 7 chars
			volume = parseInt(volume.substring(volume.indexOf("volume ") + 7)) / 100;

			if (volume > 0) {
				document.getElementsByClassName("player-video")[0].children[0].muted = false;
			}

			document.getElementsByClassName("player-video")[0].children[0].volume = volume;
		}
		else if (event.data.toLowerCase() == "togglethumbsup") {
			document.getElementsByClassName("follow-button")[0].click();
		}
		else if (event.data.toLowerCase().includes("rating ")) {
			var rating = event.data.toLowerCase();
			//+7 because "rating " is 7 chars
			rating = parseInt(rating.substring(rating.indexOf("rating ") + 7));
			var liked = document.getElementsByClassName("follow-button")[0].innerText.includes("Follow");

			if (rating > 3) {
				if (!liked) {
					document.getElementsByClassName("follow-button")[0].click();
				}
			}
			else {
				if (liked) {
					document.getElementsByClassName("follow-button")[0].click();
				}
			}
		}
	}
	catch (e) {
		ws.send("Error:" + e);
		throw e;
	}
};

var onError = function(event) {
	if (typeof event.data != 'undefined') {
		console.log("Websocket Error:" + event.data);
	}
};

function dataCheck() {
	try {
		if (document.getElementsByClassName("channel-header").length > 0) {
			var newTitle = document.getElementsByClassName("tw-card-body")[0].children[0].innerText;
			if (newTitle != oldTitle) {
				oldTitle = newTitle;
				ws.send("TITLE:" + newTitle);
			}


			var newArtist = document.getElementsByClassName("channel-header__user")[0].children[1].innerText;
			if (newArtist != oldArtist) {
				oldArtist = newArtist;
				ws.send("ARTIST:" + newArtist);
			}

			var newAlbum = document.getElementsByClassName("js-card__info")[0].children[0].innerText;
			if (newAlbum != oldAlbum) {
				oldAlbum = newAlbum;
				ws.send("ALBUM:" + newAlbum);
			}

			//If video has a game use that as album art
			if (document.getElementsByClassName("cn-metabar__boxart").length > 0) {
				var newAlbumArt = document.getElementsByClassName("cn-metabar__boxart")[0].children[0].src;
				if (newAlbumArt != oldAlbumArt) {
					oldAlbumArt = newAlbumArt;
					ws.send("COVER:" + newAlbumArt.replace("-138x190", ""));
				}
			}
			//Use profile image as backup
			else {
				var newAlbumArt = document.getElementsByClassName("cn-bar__avatar")[0].src;
				if (newAlbumArt != oldAlbumArt) {
					oldAlbumArt = newAlbumArt;
					ws.send("COVER:" + newAlbumArt.replace("-300x300", "-600x600"));
				}
			}

			//If not live
			if (document.getElementById("js-player-seek").children.length > 0) {
				var newDur = document.getElementsByClassName("player-seek__time--total")[0].innerText;
				if (newDur != oldDur) {
					oldDur = newDur;
					ws.send("DURATION:" + newDur);
				}

				var newPos = document.getElementsByClassName("player-seek__time")[0].innerText;
				if (newPos != oldPos) {
					oldPos = newPos;
					ws.send("POSITION:" + newPos);
				}
			}
			else {
				//@TODO Look at twitch api integration to current stream durration
				var newDur = parseInt(document.getElementsByClassName("player-video")[0].children[0].currentTime / 60) + ":" + pad(parseInt(document.getElementsByClassName("player-video")[0].children[0].currentTime) % 60, 2);
				if (newDur != oldDur) {
					oldDur = newDur;
					ws.send("DURATION:" + newDur);
				}

				var newPos = parseInt(document.getElementsByClassName("player-video")[0].children[0].currentTime / 60) + ":" + pad(parseInt(document.getElementsByClassName("player-video")[0].children[0].currentTime) % 60, 2);
				if (newPos != oldPos) {
					oldPos = newPos;
					ws.send("POSITION:" + newPos);
				}
			}

			var newVolume = document.getElementsByClassName("player-video")[0].children[0].volume;
			if (newVolume != oldVolume) {
				oldVolume = newVolume;
				ws.send("VOLUME:" + parseFloat(newVolume) * 100);
			}


			var newLiked = document.getElementsByClassName("follow-button")[0].innerText;
			if (newLiked != oldLiked) {
				oldLiked = newLiked;

				var following = 0;
				if (newLiked != "Follow") {
					following = 5;
				}
				ws.send("RATING:" + following);
			}

			//Twitch does not have a way to tell which button is showing so just check position of pause button
			var stateCheck = document.getElementsByClassName("js-pause-button")[0].getBoundingClientRect().top;
			var newState = 2;
			if (stateCheck > 0) {
				newState = 1;
			}
			if (newState != oldState) {
				oldState = newState;

				ws.send("STATE:" + newState);
			}
		}
		else {
			//@TODO Decide on if/how to tell it to reset data/ignore this one
			//Send playback as stopped
			var newState = 0;
			if (newState != oldState) {
				oldState = newState;
				ws.send("STATE:" + newState);
			}
		}
	}
	catch (e) {
		ws.send("Error:" + e);
		throw e;
	}
}
open();
