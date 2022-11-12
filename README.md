# Web Now Playing Companion Extension - Unofficial Updated Fork

[Source code](https://github.com/shmediaproductions/WebNowPlaying-Companion-Personal-Edit/releases)
The browser extension required to use the [WebNowPlaying plugin](https://github.com/tjhrulz/WebNowPlaying-BrowserExtension) for [Rainmeter](https://www.rainmeter.net/). This is an unnoficial fork of the original companion extension, which has been modified to enhance the experience on YouTube and Netflix and to update the site scripts more regularly.

I've also configured the extension so that it automatically sends info updates to Rainmeter when the user successfully activates a command. Normally, after executing a bang through your skin, you'd have to wait for the extension's info watcher to pick up on changes to the site. That's not a big deal when you have the tab open, since it checks for changes every 50ms. But timeouts and intervals in background tabs are throttled, so the update rate is drastically reduced (e.g., once per second in Firefox).

For example, after passing the Pause bang to a background tab, it would take up to 1 second for your skin's play/pause button to update to reflect the fact that the video was paused. But we can just send updated info as part of executing the Bang. So the extension receives the Pause bang and goes about pausing the video through JavaScript APIs, and then immediately sends Rainmeter new information indicating that the video is now paused. That means Rainmeter's state will update instantly. And then, how soon it visually updates just depends on your skin's Update properties.

The YouTube-specific changes mostly include improved logic for bangs, but also for some info. For example, YouTube's playlist loop button now has 3 states, just like WebNowPlaying has: loop off, loop all, and loop one. The new info and bang behavior handles that more accurately and efficiently. It has pretty intelligent logic for retrieving the title, artist, and album from roughly equivalent values on YouTube. Album will usually show playlist title but if not, it will show a type of genre, a hashtag, or a content category. It will also seek the highest resolution thumbnail but fall back to smaller images if necessary. The thumbs up/down and rating bangs and info correctly map to YouTube's like/dislike feature, assuming you use [Return YouTube Dislike](https://www.returnyoutubedislike.com/).

The Next and Previous bangs have been given a major overhaul, allowing them to follow different behavior depending on whether a playlist is active, loop or shuffle are enabled, etc. One of the best features is that when you're in a playlist and loop is enabled, the Next bang will return to the beginning of the playlist, as it would if you let the video play to the end. Without this, it might skip to YouTube's autoplay suggested video instead.

While shuffle is enabled, the Next bang will jump to a random video instead of the next video in the playlist. And the Previous bang will mimic the behavior of the Previous button on YouTube — go to the start of the video if we're more than 3 seconds into the video; otherwise, go back in playlist order if in a playlist; otherwise, go back in session history.

Shuffle and loop functions have also been made to work in embedded YouTube videos, even though the embedded player doesn't natively support these states. It's internal logic but it works for WebNowPlaying bangs. Generally, embedded players work just like full YouTube players. The main missing feature is the like/dislike rating feature.

Source code and downloads for the Rainmeter plugin can be found [here](https://github.com/tjhrulz/WebNowPlaying-BrowserExtension)

The original extension can be found in both the [Chrome Web Store](https://chrome.google.com/webstore/detail/webnowplaying-companion/jfakgfcdgpghbbefmdfjkbdlibjgnbli) and the [Firefox Addons Store](https://addons.mozilla.org/en-US/firefox/addon/webnowplaying-companion/).

#### If you would like to support this extension please check out the original author's [patreon](https://www.patreon.com/tjhrulz)

### List of supported sites:

- YouTube (Both new and old layouts)
- Embedded YouTube videos/playlists on any webpage
- Netflix
- Soundcloud
- Google Play Music
- Amazon Music
- Pandora
- Spotify
- Tidal
- Deezer
- Plex (Music)
- PocketCasts
- Generic site support that can be turned on in the settings
