# WebVLC Player

A web-based video player similar to VLC media player that allows users to:

- Play local video files
- Stream videos from URLs
- Add subtitles (supports SRT, VTT, ASS/SSA formats)
- Control playback with standard media controls

## Features

- Local file playback
- URL video streaming
- HLS (.m3u8) and DASH (.mpd) streaming support
- Support for more container formats (MKV, AVI, WMV, FLV)
- Subtitle support (SRT/VTT/ASS/SSA)
- Custom playback controls
- Progress tracking
- Volume control
- Fullscreen support

## How to Use

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Use the interface to select a local video file or enter a video URL
4. Optionally add subtitle files
5. Use the controls to manage playback

## Browser Compatibility

This player works best in modern browsers that support HTML5 video and the necessary JavaScript APIs:
- Chrome
- Firefox
- Edge
- Safari

For some formats like HLS and DASH, the player uses specialized libraries (hls.js and dash.js) to provide support across browsers.

## Supported Formats

### Video Containers
- MP4
- WebM
- OGG
- MKV (Matroska)
- AVI
- WMV
- FLV
- MOV

### Streaming Formats
- HLS (.m3u8)
- DASH (.mpd)

### Subtitle Formats
- SRT
- WebVTT
- ASS/SSA (basic support)

## Future Improvements

- Playlist support
- Video quality selection
- Playback speed controls
- More subtitle format support
- Keyboard shortcuts
- Picture-in-picture mode

## License

MIT License
