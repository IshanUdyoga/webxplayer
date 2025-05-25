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
    const videoContainer = document.getElementById('video-container');
    const controlsContainer = document.querySelector('.controls-container');

    // Mobile and touch detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Touch and gesture handling variables
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let lastTap = 0;
    let controlsTimeout;
    let isControlsVisible = isMobile;

    // Initialize mobile-specific behaviors
    if (isMobile || isTouchDevice) {
        initializeMobileControls();
    }

    function initializeMobileControls() {
        // Show controls by default on mobile
        if (isMobile) {
            controlsContainer.style.opacity = '1';
            isControlsVisible = true;
        }
        
        // Add touch event listeners
        videoContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        videoContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        videoContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Handle double tap for fullscreen on mobile
        videoContainer.addEventListener('touchend', handleDoubleTap);
        
        // Prevent context menu on long press
        videoContainer.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Auto-hide controls on mobile after inactivity
        if (!isMobile) {
            setupControlsAutoHide();
        }
    }
    
    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
        }
    }
    
    function handleTouchMove(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            // Prevent scrolling when swiping on video
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                e.preventDefault();
            }
        }
    }
    
    function handleTouchEnd(e) {
        if (!touchStartTime) return;
        
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;
        
        // Single tap to toggle controls (only on non-mobile or when controls are hidden)
        if (touchDuration < 300 && (!isMobile || !isControlsVisible)) {
            toggleControls();
        }
        
        touchStartTime = 0;
    }
    
    function handleDoubleTap(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 500 && tapLength > 0) {
            // Double tap detected
            e.preventDefault();
            toggleFullscreen();
        }
        lastTap = currentTime;
    }
    
    function toggleControls() {
        if (isMobile) return; // Controls always visible on mobile
        
        isControlsVisible = !isControlsVisible;
        controlsContainer.style.opacity = isControlsVisible ? '1' : '0';
        
        if (isControlsVisible) {
            setupControlsAutoHide();
        }
    }
    
    function setupControlsAutoHide() {
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            if (!isMobile && !videoPlayer.paused) {
                isControlsVisible = false;
                controlsContainer.style.opacity = '0';
            }
        }, 3000);
    }
    
    function toggleFullscreen() {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else {
            // Enter fullscreen
            const element = videoContainer;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        }
    }

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

    // Enhanced progress bar for touch devices
    function enhanceProgressBarForTouch() {
        const progressContainer = document.querySelector('.progress-container');
        const seekSlider = document.querySelector('.seek-slider');
        
        if (isTouchDevice) {
            // Make progress bar larger on touch devices
            progressContainer.style.height = '25px';
            seekSlider.style.height = '25px';
            
            // Add touch event listeners for better seeking
            let isDragging = false;
            
            progressContainer.addEventListener('touchstart', (e) => {
                isDragging = true;
                updateSeekPosition(e.touches[0]);
                e.preventDefault();
            });
            
            progressContainer.addEventListener('touchmove', (e) => {
                if (isDragging) {
                    updateSeekPosition(e.touches[0]);
                    e.preventDefault();
                }
            });
            
            progressContainer.addEventListener('touchend', () => {
                isDragging = false;
            });
            
            function updateSeekPosition(touch) {
                const rect = progressContainer.getBoundingClientRect();
                const pos = (touch.clientX - rect.left) / rect.width;
                const time = pos * videoPlayer.duration;
                
                if (time >= 0 && time <= videoPlayer.duration) {
                    videoPlayer.currentTime = time;
                }
            }
        }
    }
    
    // Enhanced volume control for mobile
    function enhanceVolumeControlForMobile() {
        if (isMobile) {
            // Hide volume control on mobile (use hardware buttons)
            const volumeControl = document.querySelector('.volume-control');
            if (volumeControl) {
                volumeControl.style.display = 'none';
            }
        }
    }
    
    // Keyboard shortcuts (only for non-touch devices or tablets)
    function setupKeyboardShortcuts() {
        if (!isMobile || isTablet) {
            document.addEventListener('keydown', function(e) {
                // Prevent shortcuts when typing in inputs
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                
                switch(e.code) {
                    case 'Space':
                        e.preventDefault();
                        togglePlayPause();
                        break;
                    case 'KeyF':
                        e.preventDefault();
                        toggleFullscreen();
                        break;
                    case 'KeyM':
                        e.preventDefault();
                        toggleMute();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        skipTime(-10);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        skipTime(10);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        adjustVolume(0.1);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        adjustVolume(-0.1);
                        break;
                }
            });
        }
    }
    
    function skipTime(seconds) {
        videoPlayer.currentTime = Math.max(0, Math.min(videoPlayer.duration, videoPlayer.currentTime + seconds));
    }
    
    function adjustVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, videoPlayer.volume + delta));
        videoPlayer.volume = newVolume;
        if (volumeSlider) volumeSlider.value = newVolume;
        updateMuteButton();
    }
    
    function toggleMute() {
        videoPlayer.muted = !videoPlayer.muted;
        updateMuteButton();
    }

    // Play local video file
    videoFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const videoUrl = detectAndHandleFormat(file, true);
            resetSubtitles();
            
            // Show loading state on mobile
            if (isMobile) {
                showToast('Loading video...');
            }
        }
    });

    // Play video from URL
    loadUrlButton.addEventListener('click', function() {
        const url = videoUrlInput.value.trim();
        if (url) {
            detectAndHandleFormat(url);
            resetSubtitles();
            
            if (isMobile) {
                showToast('Loading stream...');
            }
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
            videoPlayer.play().then(() => {
                if (playPauseButton) {
                    playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                }
                if (!isMobile) {
                    setupControlsAutoHide();
                }
            }).catch(error => {
                console.warn('Play failed:', error);
                showToast('Playback failed');
            });
        } else {
            videoPlayer.pause();
            if (playPauseButton) {
                playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
            }
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
        if (!muteButton) return;
        
        if (videoPlayer.muted || videoPlayer.volume === 0) {
            muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (videoPlayer.volume < 0.5) {
            muteButton.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }

    // Volume control
    volumeSlider.addEventListener('input', function() {
        videoPlayer.volume = volumeSlider.value;
        videoPlayer.muted = (volumeSlider.value == 0);
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
    videoPlayer.addEventListener('loadedmetadata', function() {
        updateProgress();
        enhanceProgressBarForTouch();
    });

    function updateProgress() {
        const currentTime = videoPlayer.currentTime;
        const duration = videoPlayer.duration;
        
        if (!isNaN(duration) && duration > 0) {
            // Update progress bar
            const progressPercentage = (currentTime / duration) * 100;
            if (progressFill) {
                progressFill.style.width = progressPercentage + '%';
            }
            
            // Update time display
            if (currentTimeElement) {
                currentTimeElement.textContent = formatTime(currentTime);
            }
            if (durationElement) {
                durationElement.textContent = formatTime(duration);
            }
        }
    }

    // Enhanced seek functionality
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.addEventListener('click', function(e) {
            const rect = progressContainer.getBoundingClientRect();
            const clickPosition = e.clientX - rect.left;
            const percentage = clickPosition / rect.width;
            
            if (videoPlayer.duration) {
                videoPlayer.currentTime = percentage * videoPlayer.duration;
            }
        });
    }

    // Toast notification system
    function showToast(message, duration = 3000) {
        const toast = document.querySelector('.toast-notification');
        const content = document.querySelector('.toast-content');
        
        if (toast && content) {
            content.textContent = message;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, duration);
        }
    }

    // Format time in MM:SS format
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        seconds = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // Initialize everything
    updateMuteButton();
    enhanceVolumeControlForMobile();
    setupKeyboardShortcuts();
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            // Recalculate dimensions after orientation change
            if (videoPlayer) {
                videoPlayer.style.width = '100%';
                videoPlayer.style.height = '100%';
            }
        }, 100);
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        // Update mobile detection on resize
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile !== isMobile) {
            location.reload(); // Reload to apply mobile/desktop styles
        }
    });

    // Prevent zoom on double tap for better UX
    if (isTouchDevice) {
        document.addEventListener('touchend', function(e) {
            const touch = e.changedTouches[0];
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();
            }
        }, { passive: false });
    }
});
