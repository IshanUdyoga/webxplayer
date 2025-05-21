document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const videoPlayer = document.getElementById('video-player');
    const videoFileInput = document.getElementById('video-file');
    const videoUrlInput = document.getElementById('video-url');
    const loadUrlButton = document.getElementById('load-url');
    const subtitleFileInput = document.getElementById('subtitle-file');
    const playPauseButton = document.getElementById('play-pause');
    const muteButton = document.getElementById('mute-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const fullscreenButton = document.getElementById('fullscreen-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progressFill = document.querySelector('.progress-fill');
    const currentTimeElement = document.getElementById('current-time');
    const durationElement = document.getElementById('duration');

    // Format support libraries
    let hlsPlayer = null;
    let dashPlayer = null;

    // Format detection and handling
    function detectAndHandleFormat(url, isFile = false) {
        const extension = getFileExtension(url);
        const mimeType = isFile ? url.type : getMimeTypeFromExtension(extension);
        
        // Check if we need to use external players
        if (!isFile && (url.includes('.m3u8') || extension === 'm3u8')) {
            // HLS stream
            return setupHLSPlayer(url);
        } else if (!isFile && (url.includes('.mpd') || extension === 'mpd')) {
            // DASH stream
            return setupDASHPlayer(url);
        } else if (['mkv', 'avi', 'wmv', 'flv'].includes(extension) && isFile) {
            // Container formats that need transcoding
            return transcode(url);
        }

        // Default: use browser's native player
        videoPlayer.src = url;
        videoPlayer.load();
        return url;
    }

    function getFileExtension(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop() || '';
            return filename.split('.').pop().toLowerCase();
        } catch (e) {
            // If not a valid URL, try to extract extension directly
            return url.split('.').pop().toLowerCase();
        }
    }

    function getMimeTypeFromExtension(extension) {
        const mimeMap = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mov': 'video/quicktime',
            'mkv': 'video/x-matroska',
            'avi': 'video/x-msvideo',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'm3u8': 'application/x-mpegURL',
            'mpd': 'application/dash+xml'
        };
        return mimeMap[extension] || 'video/mp4';
    }

    // Setup HLS.js for HLS streams
    function setupHLSPlayer(url) {
        if (Hls.isSupported()) {
            if (hlsPlayer) {
                hlsPlayer.destroy();
            }
            hlsPlayer = new Hls();
            hlsPlayer.loadSource(url);
            hlsPlayer.attachMedia(videoPlayer);
            hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
                videoPlayer.play().catch(error => {
                    console.warn('Auto-play failed:', error);
                });
            });
            // Error handling
            hlsPlayer.on(Hls.Events.ERROR, function(event, data) {
                console.error('HLS error:', data);
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hlsPlayer.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hlsPlayer.recoverMediaError();
                            break;
                        default:
                            // Unrecoverable error
                            hlsPlayer.destroy();
                            break;
                    }
                }
            });
            return url;
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            videoPlayer.src = url;
            videoPlayer.load();
            return url;
        }
    }

    // Setup dash.js for DASH streams
    function setupDASHPlayer(url) {
        if (typeof dashjs !== 'undefined') {
            if (dashPlayer) {
                dashPlayer.reset();
            }
            dashPlayer = dashjs.MediaPlayer().create();
            dashPlayer.initialize(videoPlayer, url, false);
            dashPlayer.updateSettings({
                'streaming': {
                    'abr': {
                        'autoSwitchBitrate': {
                            'audio': true,
                            'video': true
                        }
                    }
                }
            });
            return url;
        } else {
            console.error('DASH.js not loaded');
            return url;
        }
    }

    // For container formats that need special handling
    function transcode(fileObj) {
        // For local files, we just use the URL.createObjectURL
        // In a full implementation, you could use a worker to transcode 
        // or a server-side solution
        return URL.createObjectURL(fileObj);
    }

    // Play local video file
    videoFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const videoUrl = detectAndHandleFormat(file, true);
            resetSubtitles();
        }
    });

    // Play video from URL
    loadUrlButton.addEventListener('click', function() {
        const url = videoUrlInput.value.trim();
        if (url) {
            detectAndHandleFormat(url);
            resetSubtitles();
        }
    });

    // Load subtitles
    subtitleFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            loadSubtitles(file);
        }
    });

    // Load subtitles function
    function loadSubtitles(file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const fileURL = URL.createObjectURL(file);
        
        // Remove existing tracks
        while (videoPlayer.textTracks.length > 0) {
            videoPlayer.removeChild(videoPlayer.textTracks[0]);
        }
        
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = 'Custom Subtitles';
        track.srclang = 'en';
        track.src = fileURL;
        track.default = true;
        
        videoPlayer.appendChild(track);
        
        // Handle different subtitle formats
        if (fileExtension === 'srt') {
            convertSrtToVtt(file, function(vttUrl) {
                track.src = vttUrl;
            });
        } else if (fileExtension === 'ass' || fileExtension === 'ssa') {
            convertAssToVtt(file, function(vttUrl) {
                track.src = vttUrl;
            });
        } else if (fileExtension === 'sub') {
            // Handle SUB/IDX format - more complex, might need server-side help
            convertSubToVtt(file, function(vttUrl) {
                track.src = vttUrl;
            });
        }
    }

    // Reset subtitles
    function resetSubtitles() {
        while (videoPlayer.textTracks.length > 0) {
            videoPlayer.removeChild(videoPlayer.textTracks[0]);
        }
        subtitleFileInput.value = '';
    }

    // Convert SRT to VTT format
    function convertSrtToVtt(srtFile, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            let srtContent = e.target.result;
            
            // Add WebVTT header
            let vttContent = 'WEBVTT\n\n';
            
            // Fix timestamps: SRT uses comma, VTT uses dot as decimal separator
            vttContent += srtContent.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4');
            
            // Create a Blob and URL
            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
            const vttUrl = URL.createObjectURL(vttBlob);
            
            callback(vttUrl);
        };
        reader.readAsText(srtFile);
    }
    
    // Convert ASS/SSA to VTT format (basic conversion)
    function convertAssToVtt(assFile, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            let assContent = e.target.result;
            // Add WebVTT header
            let vttContent = 'WEBVTT\n\n';
            
            // Very basic conversion - a full implementation would need to parse the ASS format properly
            // This just extracts Dialogue lines and converts timestamps
            const dialogueLines = assContent.split('\n').filter(line => line.startsWith('Dialogue:'));
            
            dialogueLines.forEach(line => {
                const parts = line.split(',');
                if (parts.length >= 10) {
                    // Extract start and end times (typically the 1st and 2nd parts after "Dialogue:")
                    const startTime = parts[1].trim();
                    const endTime = parts[2].trim();
                    
                    // Extract text (everything after the 9th comma)
                    const text = parts.slice(9).join(',').trim();
                    
                    // Convert h:mm:ss.cc format to WebVTT format
                    const convertedStart = convertAssTimeToVtt(startTime);
                    const convertedEnd = convertAssTimeToVtt(endTime);
                    
                    // Add to VTT content
                    vttContent += `${convertedStart} --> ${convertedEnd}\n${text}\n\n`;
                }
            });
            
            // Create a Blob and URL
            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
            const vttUrl = URL.createObjectURL(vttBlob);
            
            callback(vttUrl);
        };
        reader.readAsText(assFile);
    }
    
    function convertAssTimeToVtt(assTime) {
        // ASS format is typically h:mm:ss.cc
        // Need to convert to WebVTT format hh:mm:ss.sss
        const parts = assTime.split(':');
        if (parts.length === 3) {
            const hours = parts[0].padStart(2, '0');
            const minutes = parts[1].padStart(2, '0');
            
            // Handle centiseconds to milliseconds conversion
            let seconds = parts[2];
            if (seconds.includes('.')) {
                const secParts = seconds.split('.');
                seconds = secParts[0].padStart(2, '0') + '.' + (secParts[1] + '00').substring(0, 3);
            } else {
                seconds = seconds.padStart(2, '0') + '.000';
            }
            
            return `${hours}:${minutes}:${seconds}`;
        }
        return assTime; // Return as-is if not in expected format
    }
    
    // Basic SUB format conversion (very simplified)
    function convertSubToVtt(subFile, callback) {
        // This is a placeholder. SUB/IDX conversion is complex and might need server-side assistance
        const reader = new FileReader();
        reader.onload = function(e) {
            // Just a minimal placeholder - a real implementation would be more complex
            const vttContent = 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nUnsupported subtitle format. Please use SRT or VTT.';
            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
            const vttUrl = URL.createObjectURL(vttBlob);
            callback(vttUrl);
        };
        reader.readAsText(subFile);
    }

    // Play/Pause functionality
    playPauseButton.addEventListener('click', togglePlayPause);
    videoPlayer.addEventListener('click', togglePlayPause);

    function togglePlayPause() {
        if (videoPlayer.paused || videoPlayer.ended) {
            videoPlayer.play();
            playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            videoPlayer.pause();
            playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    // Update play/pause button on video events
    videoPlayer.addEventListener('play', function() {
        playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    });

    videoPlayer.addEventListener('pause', function() {
        playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    });

    videoPlayer.addEventListener('ended', function() {
        playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    });

    // Mute/Unmute functionality
    muteButton.addEventListener('click', function() {
        videoPlayer.muted = !videoPlayer.muted;
        updateMuteButton();
    });

    function updateMuteButton() {
        if (videoPlayer.muted || videoPlayer.volume === 0) {
            muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
            muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }

    // Volume control
    volumeSlider.addEventListener('input', function() {
        videoPlayer.volume = volumeSlider.value;
        videoPlayer.muted = (volumeSlider.value === 0);
        updateMuteButton();
    });

    // Fullscreen functionality
    fullscreenButton.addEventListener('click', function() {
        if (videoPlayer.requestFullscreen) {
            videoPlayer.requestFullscreen();
        } else if (videoPlayer.webkitRequestFullscreen) { /* Safari */
            videoPlayer.webkitRequestFullscreen();
        } else if (videoPlayer.msRequestFullscreen) { /* IE11 */
            videoPlayer.msRequestFullscreen();
        }
    });

    // Progress bar functionality
    videoPlayer.addEventListener('timeupdate', updateProgress);

    function updateProgress() {
        const currentTime = videoPlayer.currentTime;
        const duration = videoPlayer.duration;
        
        if (!isNaN(duration)) {
            // Update progress bar
            const progressPercentage = (currentTime / duration) * 100;
            progressFill.style.width = progressPercentage + '%';
            
            // Update time display
            currentTimeElement.textContent = formatTime(currentTime);
            durationElement.textContent = formatTime(duration);
        }
    }

    // Format time in MM:SS format
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    // Seek functionality when clicking progress bar
    progressBar.addEventListener('click', function(e) {
        const progressBarRect = progressBar.getBoundingClientRect();
        const clickPositionInBar = e.clientX - progressBarRect.left;
        const percentageClicked = clickPositionInBar / progressBarRect.width;
        
        videoPlayer.currentTime = percentageClicked * videoPlayer.duration;
    });

    // Initialize volume display
    updateMuteButton();
});
