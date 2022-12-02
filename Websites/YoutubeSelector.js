//Decides which version of youtube the user is using.
/* import-globals-from ../WebNowPlaying.js */
/* import-globals-from Youtube.js */
/* import-globals-from YoutubeTV.js */

if (document.location.href.includes("/tv#/")) {
  setupTV();
  init();
} else {
  setup();
  init();
}

//chrome.runtime.sendMessage(
//{
//	method: "getURL"
//}, function(response)
//{
//	console.log(response.ID);
//});
//
