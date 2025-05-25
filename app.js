document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const videoPlayer = document.getElementById('video-player');
    const videoContainer = document.getElementById('video-container');
    const playPauseBtn = document.querySelector('.play-pause');
    const bigPlayButton = document.querySelector('.big-play-button');
    const stopBtn = document.querySelector('.stop');
    const skipBackwardBtn = document.querySelector('.skip-backward');
    const skipForwardBtn = document.querySelector('.skip-forward');
    const volumeBtn = document.querySelector('.volume-btn');
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeContainer = document.querySelector('.volume-slider-container');
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    const settingsBtn = document.querySelector('.settings-btn');
    const settingsPanel = document.querySelector('.settings-panel');
    const closeSettingsBtn = document.querySelector('.close-settings');
    const speedBtn = document.querySelector('.speed-btn');
    const speedDropdown = document.querySelector('.speed-dropdown');
    const speedOptions = document.querySelectorAll('.speed-option');
    const speedValue = document.querySelector('.speed-value');
    const currentTimeEl = document.querySelector('.current-time');
    const totalTimeEl = document.querySelector('.total-time');
    const progressBar = document.querySelector('.progress-bar');
    const bufferedBar = document.querySelector('.buffered-bar');
    const seekSlider = document.querySelector('.seek-slider');
    const timeTooltip = document.querySelector('.time-tooltip');
    const subtitleBtn = document.querySelector('.subtitle-btn');
    const subtitleUpload = document.getElementById('subtitle-upload');
    const subtitleContainer = document.getElementById('subtitle-container');
    const mediaUpload = document.getElementById('media-upload');
    const playlist = document.getElementById('playlist');
    const qualityOptions = document.querySelectorAll('.quality-option');
    const themeOptions = document.querySelectorAll('.theme-option');
    const toast = document.querySelector('.toast-notification');
    const toastContent = document.querySelector('.toast-content');
    
    // URL streaming elements
    const videoUrlInput = document.getElementById('video-url');
    const loadUrlButton = document.getElementById('load-url');
    const urlHistoryList = document.getElementById('url-history-list');

    // State variables
    let isPlaying = false;
    let isMuted = false;
    let isFullscreen = false;
    let hideControlsTimeout;
    let currentPlaybackRate = 1.0;
    let playlistItems = [];
    let currentMediaIndex = -1;
    let subtitles = [];
    let currentTheme = 'dark';
    let urlHistory = [];
    const MAX_URL_HISTORY = 5;

    // Subtitle settings
    let subtitleSettings = {
        enabled: true,
        delay: 0,
        fontSize: 1.0,
        bgOpacity: 0.6,
        color: '#ffffff',
        position: 'bottom'
    };

    // Initialize player
    function initPlayer() {
        updateTheme();
        setupEventListeners();
        loadPlaylistFromLocalStorage();
        loadUrlHistoryFromLocalStorage();
        loadSubtitleSettingsFromLocalStorage();
        initializeFloatingControls();
        applySubtitleSettings();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Video events
        videoPlayer.addEventListener('loadedmetadata', updateTotalTime);
        videoPlayer.addEventListener('timeupdate', updateProgress);
        videoPlayer.addEventListener('progress', updateBufferProgress);
        videoPlayer.addEventListener('ended', handleMediaEnd);
        videoPlayer.addEventListener('volumechange', updateVolumeIcon);
        videoPlayer.addEventListener('error', handleVideoError);

        // Play/Pause control
        playPauseBtn.addEventListener('click', togglePlayPause);
        bigPlayButton.addEventListener('click', togglePlayPause);
        videoPlayer.addEventListener('click', togglePlayPause);

        // URL streaming
        loadUrlButton.addEventListener('click', loadVideoFromUrl);
        videoUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadVideoFromUrl();
            }
        });

        // Other controls
        stopBtn.addEventListener('click', stopMedia);
        skipBackwardBtn.addEventListener('click', skipBackward);
        skipForwardBtn.addEventListener('click', skipForward);
        volumeBtn.addEventListener('click', toggleMute);
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        settingsBtn.addEventListener('click', toggleSettings);
        closeSettingsBtn.addEventListener('click', toggleSettings);

        // Seek controls
        seekSlider.addEventListener('input', handleSeek);
        seekSlider.addEventListener('mousemove', updateSeekTooltip);
        seekSlider.addEventListener('mouseenter', () => timeTooltip.style.display = 'block');
        seekSlider.addEventListener('mouseleave', () => timeTooltip.style.display = 'none');

        // Speed control
        speedBtn.addEventListener('click', () => toggleDropdown(speedDropdown));
        speedOptions.forEach(option => {
            option.addEventListener('click', () => changePlaybackSpeed(option.dataset.speed));
        });

        // Volume control
        volumeBtn.addEventListener('mouseenter', () => volumeContainer.style.display = 'block');
        volumeContainer.addEventListener('mouseleave', () => volumeContainer.style.display = 'none');
        volumeSlider.addEventListener('input', changeVolume);

        // Subtitle control
        subtitleBtn.addEventListener('click', toggleSubtitles);
        subtitleUpload.addEventListener('change', loadSubtitles);

        // Media upload
        mediaUpload.addEventListener('change', handleMediaUpload);

        // Settings controls
        qualityOptions.forEach(option => {
            option.addEventListener('click', () => changeQuality(option.dataset.quality));
        });

        themeOptions.forEach(option => {
            option.addEventListener('click', () => changeTheme(option.dataset.theme));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcut);

        // Hide controls when mouse is inactive
        videoContainer.addEventListener('mousemove', showControls);
        videoContainer.addEventListener('mouseleave', hideControls);
        document.querySelector('.controls-container').addEventListener('mouseenter', () => {
            clearTimeout(hideControlsTimeout);
        });
        document.querySelector('.controls-container').addEventListener('mouseleave', () => {
            if (isPlaying) {
                startHideControlsTimer();
            }
        });

        // Settings tabs
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.settings-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const tabName = button.dataset.tab;
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });

        // Subtitle settings
        const subtitleToggle = document.getElementById('subtitle-toggle');
        subtitleToggle.checked = subtitleSettings.enabled;
        subtitleToggle.addEventListener('change', () => {
            subtitleSettings.enabled = subtitleToggle.checked;
            subtitleContainer.style.display = subtitleSettings.enabled ? 'block' : 'none';
            saveSubtitleSettingsToLocalStorage();
            showToast(subtitleSettings.enabled ? "Subtitles enabled" : "Subtitles disabled");
        });

        // Subtitle delay control
        const subtitleDelayValue = document.getElementById('subtitle-delay-value');
        const subtitleDelayMinus = document.getElementById('subtitle-delay-minus');
        const subtitleDelayPlus = document.getElementById('subtitle-delay-plus');
        const subtitleDelayReset = document.getElementById('subtitle-delay-reset');
        
        subtitleDelayValue.value = subtitleSettings.delay;
        
        subtitleDelayValue.addEventListener('change', () => {
            subtitleSettings.delay = parseFloat(subtitleDelayValue.value);
            saveSubtitleSettingsToLocalStorage();
            showToast(`Subtitle delay: ${subtitleSettings.delay}s`);
        });
        
        subtitleDelayMinus.addEventListener('click', () => {
            subtitleSettings.delay = Math.max(parseFloat(subtitleDelayValue.value) - 0.1, -10).toFixed(1);
            subtitleDelayValue.value = subtitleSettings.delay;
            saveSubtitleSettingsToLocalStorage();
            showToast(`Subtitle delay: ${subtitleSettings.delay}s`);
        });
        
        subtitleDelayPlus.addEventListener('click', () => {
            subtitleSettings.delay = Math.min(parseFloat(subtitleDelayValue.value) + 0.1, 10).toFixed(1);
            subtitleDelayValue.value = subtitleSettings.delay;
            saveSubtitleSettingsToLocalStorage();
            showToast(`Subtitle delay: ${subtitleSettings.delay}s`);
        });
        
        subtitleDelayReset.addEventListener('click', () => {
            subtitleSettings.delay = 0;
            subtitleDelayValue.value = subtitleSettings.delay;
            saveSubtitleSettingsToLocalStorage();
            showToast("Subtitle delay reset");
        });

        // Font size control
        const subtitleSize = document.getElementById('subtitle-size');
        const subtitleSizeValue = document.getElementById('subtitle-size-value');
        
        subtitleSize.value = subtitleSettings.fontSize;
        subtitleSizeValue.textContent = `${Math.round(subtitleSettings.fontSize * 100)}%`;
        
        subtitleSize.addEventListener('input', () => {
            subtitleSettings.fontSize = parseFloat(subtitleSize.value);
            subtitleSizeValue.textContent = `${Math.round(subtitleSettings.fontSize * 100)}%`;
            applySubtitleSettings();
        });
        
        subtitleSize.addEventListener('change', () => {
            saveSubtitleSettingsToLocalStorage();
            showToast(`Subtitle size: ${Math.round(subtitleSettings.fontSize * 100)}%`);
        });

        // Background opacity control
        const subtitleBgOpacity = document.getElementById('subtitle-bg-opacity');
        const subtitleBgOpacityValue = document.getElementById('subtitle-bg-opacity-value');
        
        subtitleBgOpacity.value = subtitleSettings.bgOpacity;
        subtitleBgOpacityValue.textContent = `${Math.round(subtitleSettings.bgOpacity * 100)}%`;
        
        subtitleBgOpacity.addEventListener('input', () => {
            subtitleSettings.bgOpacity = parseFloat(subtitleBgOpacity.value);
            subtitleBgOpacityValue.textContent = `${Math.round(subtitleSettings.bgOpacity * 100)}%`;
            applySubtitleSettings();
        });
        
        subtitleBgOpacity.addEventListener('change', () => {
            saveSubtitleSettingsToLocalStorage();
            showToast(`Subtitle background: ${Math.round(subtitleSettings.bgOpacity * 100)}%`);
        });

        // Font color options
        const colorOptions = document.querySelectorAll('.color-option');
        
        colorOptions.forEach(option => {
            if (option.dataset.color === subtitleSettings.color) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', () => {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                subtitleSettings.color = option.dataset.color;
                applySubtitleSettings();
                saveSubtitleSettingsToLocalStorage();
                showToast("Subtitle color changed");
            });
        });

        // Position options
        const positionOptions = document.querySelectorAll('.position-option');
        
        positionOptions.forEach(option => {
            if (option.dataset.position === subtitleSettings.position) {
                option.classList.add('selected');
            }
            
            option.addEventListener('click', () => {
                positionOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                subtitleSettings.position = option.dataset.position;
                applySubtitleSettings();
                saveSubtitleSettingsToLocalStorage();
                showToast(`Subtitle position: ${subtitleSettings.position}`);
            });
        });
    }

    // Initialize floating controls behavior
    function initializeFloatingControls() {
        const controlsContainer = document.querySelector('.controls-container');
        const videoOverlay = document.querySelector('.video-overlay');
        controlsContainer.style.opacity = '0';
        
        // Show controls initially when video is loaded
        videoPlayer.addEventListener('loadeddata', () => {
            showControls();
            setTimeout(() => {
                if (isPlaying) {
                    startHideControlsTimer();
                }
            }, 3000);
        });
        
        // Show controls on pause
        videoPlayer.addEventListener('pause', () => {
            controlsContainer.style.opacity = '1';
            videoOverlay.style.opacity = '1';
            clearTimeout(hideControlsTimeout);
        });
        
        // Hide controls when playing if mouse is inactive
        videoPlayer.addEventListener('play', () => {
            startHideControlsTimer();
        });
        
        // Prevent controls from hiding when mouse is over them
        controlsContainer.addEventListener('mouseenter', () => {
            controlsContainer.style.opacity = '1';
            clearTimeout(hideControlsTimeout);
        });
        
        controlsContainer.addEventListener('mouseleave', () => {
            if (isPlaying) {
                startHideControlsTimer();
            }
        });
        
        // Sync video overlay with controls visibility
        videoPlayer.addEventListener('mouseenter', () => {
            if (!isPlaying) {
                videoOverlay.style.opacity = '1';
            }
        });

        // Update format info when media is loaded
        videoPlayer.addEventListener('loadeddata', () => {
            updateFormatInfo();
            // Show controls when media is loaded
            showControls();
            setTimeout(() => {
                if (isPlaying) {
                    startHideControlsTimer();
                }
            }, 3000);
        });
    }

    // URL streaming functions
    function loadVideoFromUrl() {
        const url = videoUrlInput.value.trim();
        if (!url) {
            showToast('Please enter a video URL');
            return;
        }

        try {
            // Validate URL format
            new URL(url);
            
            // Check if URL seems to be a video or media URL
            const isLikelyMedia = /\.(mp4|webm|ogg|mp3|avi|mov|wmv|flv|mkv)($|\?)/i.test(url) || 
                                 /(youtube\.com|vimeo\.com|dailymotion\.com|twitch\.tv)/i.test(url);
            
            if (!isLikelyMedia) {
                // Still try to load it, but warn the user
                showToast('URL might not be a valid media file, but trying anyway');
            }
            
            // Create a media object for the URL
            const mediaItem = {
                name: extractFilenameFromUrl(url),
                type: 'video',
                url: url,
                isStream: true
            };
            
            // Add to playlist
            playlistItems.push(mediaItem);
            currentMediaIndex = playlistItems.length - 1;
            
            // Add to URL history
            addToUrlHistory(url);
            
            // Load and play the video
            videoPlayer.src = url;
            videoPlayer.load();
            
            // Play the video
            videoPlayer.play()
                .then(() => {
                    isPlaying = true;
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    bigPlayButton.innerHTML = '<i class="fas fa-pause"></i>';
                    showToast(`Playing stream from URL`);
                })
                .catch(error => {
                    console.error('Error playing video:', error);
                    showToast('Error playing video. Try a different URL or format.');
                });
            
            // Update UI
            renderPlaylist();
            savePlaylistToLocalStorage();
            
            // Update format info
            updateFormatInfo();
        } catch (error) {
            console.error('Error loading video URL:', error);
            showToast('Invalid URL format. Please check and try again.');
        }
    }

    function extractFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            
            // If we have a filename with an extension, use it
            if (filename && filename.includes('.')) {
                return decodeURIComponent(filename);
            } 
            // Otherwise use the domain name with "stream" prefix
            return `Stream from ${urlObj.hostname}`;
        } catch (error) {
            return 'Video Stream';
        }
    }

    function addToUrlHistory(url) {
        // Remove the URL if it already exists to avoid duplicates
        urlHistory = urlHistory.filter(item => item !== url);
        
        // Add the new URL to the beginning
        urlHistory.unshift(url);
        
        // Keep only the maximum number of URLs
        if (urlHistory.length > MAX_URL_HISTORY) {
            urlHistory = urlHistory.slice(0, MAX_URL_HISTORY);
        }
        
        // Update the URL history display
        renderUrlHistory();
        
        // Save to local storage
        saveUrlHistoryToLocalStorage();
    }

    function renderUrlHistory() {
        urlHistoryList.innerHTML = '';
        
        urlHistory.forEach(url => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="fas fa-history"></i>
                <span title="${url}">${truncateString(url, 30)}</span>
            `;
            
            li.addEventListener('click', () => {
                videoUrlInput.value = url;
                loadVideoFromUrl();
            });
            
            urlHistoryList.appendChild(li);
        });
    }

    function truncateString(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }

    function saveUrlHistoryToLocalStorage() {
        try {
            localStorage.setItem('webXPlayerUrlHistory', JSON.stringify(urlHistory));
        } catch (error) {
            console.error('Error saving URL history to local storage:', error);
        }
    }

    function loadUrlHistoryFromLocalStorage() {
        try {
            const storedHistory = localStorage.getItem('webXPlayerUrlHistory');
            if (storedHistory) {
                urlHistory = JSON.parse(storedHistory);
                renderUrlHistory();
            }
        } catch (error) {
            console.error('Error loading URL history from local storage:', error);
            urlHistory = [];
        }
    }

    function handleVideoError(e) {
        let errorMessage;
        
        switch (videoPlayer.error?.code) {
            case 1: // MEDIA_ERR_ABORTED
                errorMessage = 'Video playback was aborted';
                break;
            case 2: // MEDIA_ERR_NETWORK
                errorMessage = 'Network error occurred while loading the video';
                break;
            case 3: // MEDIA_ERR_DECODE
                errorMessage = 'Video format is not supported or file is corrupted';
                break;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                errorMessage = 'Video format is not supported by your browser';
                break;
            default:
                errorMessage = 'An unknown error occurred';
        }
        
        console.error('Video Error:', errorMessage, videoPlayer.error);
        showToast(`Error: ${errorMessage}`);
        
        // Update UI to show error state
        pauseMedia();
    }

    // Play/Pause functions
    function togglePlayPause() {
        if (videoPlayer.paused || videoPlayer.ended) {
            playMedia();
        } else {
            pauseMedia();
            showControls(); // Make sure controls are visible when paused
            clearTimeout(hideControlsTimeout); // Don't hide controls when paused
        }
    }

    function playMedia() {
        if (videoPlayer.src) {
            videoPlayer.play()
                .then(() => {
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    bigPlayButton.innerHTML = '<i class="fas fa-pause"></i>';
                    isPlaying = true;
                })
                .catch(error => {
                    console.error('Error playing media:', error);
                    showToast('Error playing media. File may be corrupt or unsupported.');
                });
        }
    }

    function pauseMedia() {
        videoPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        bigPlayButton.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
    }

    function stopMedia() {
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        bigPlayButton.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
    }

    // Skip functions
    function skipBackward() {
        videoPlayer.currentTime = Math.max(videoPlayer.currentTime - 10, 0);
        showToast("Rewound 10 seconds");
    }

    function skipForward() {
        videoPlayer.currentTime = Math.min(videoPlayer.currentTime + 10, videoPlayer.duration);
        showToast("Skipped 10 seconds");
    }

    // Volume functions
    function toggleMute() {
        videoPlayer.muted = !videoPlayer.muted;
        isMuted = videoPlayer.muted;
        updateVolumeIcon();
        showToast(isMuted ? "Muted" : "Unmuted");
    }

    function updateVolumeIcon() {
        let volumeIcon;
        if (videoPlayer.muted || videoPlayer.volume === 0) {
            volumeIcon = '<i class="fas fa-volume-mute"></i>';
        } else if (videoPlayer.volume < 0.5) {
            volumeIcon = '<i class="fas fa-volume-down"></i>';
        } else {
            volumeIcon = '<i class="fas fa-volume-up"></i>';
        }
        volumeBtn.innerHTML = volumeIcon;
    }

    function changeVolume() {
        videoPlayer.volume = volumeSlider.value;
        videoPlayer.muted = videoPlayer.volume === 0;
        updateVolumeIcon();
    }

    // Fullscreen function
    function toggleFullscreen() {
        if (!isFullscreen) {
            if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen();
            } else if (videoContainer.webkitRequestFullscreen) {
                videoContainer.webkitRequestFullscreen();
            } else if (videoContainer.msRequestFullscreen) {
                videoContainer.msRequestFullscreen();
            }
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            isFullscreen = true;
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            isFullscreen = false;
        }
        showToast(isFullscreen ? "Entered fullscreen" : "Exited fullscreen");
    }

    // Settings function
    function toggleSettings() {
        settingsPanel.classList.toggle('show');
        if (settingsPanel.classList.contains('show')) {
            showControls();
            clearTimeout(hideControlsTimeout);
        } else if (isPlaying) {
            startHideControlsTimer();
        }
    }

    // Playback speed functions
    function toggleDropdown(dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }

    function changePlaybackSpeed(speed) {
        currentPlaybackRate = parseFloat(speed);
        videoPlayer.playbackRate = currentPlaybackRate;
        speedValue.textContent = `${speed}x`;
        speedDropdown.style.display = 'none';
        updateSpeedOptions();
        showToast(`Playback speed: ${speed}x`);
    }

    function updateSpeedOptions() {
        speedOptions.forEach(option => {
            option.classList.remove('selected');
            if (parseFloat(option.dataset.speed) === currentPlaybackRate) {
                option.classList.add('selected');
            }
        });
    }

    // Progress functions
    function updateProgress() {
        const currentTime = videoPlayer.currentTime;
        const duration = videoPlayer.duration || 0;
        
        // Update current time display
        currentTimeEl.textContent = formatTime(currentTime);
        
        // Update progress bar
        if (duration > 0) {
            const percentage = (currentTime / duration) * 100;
            progressBar.style.width = `${percentage}%`;
            seekSlider.value = percentage;
        }
        
        // Update subtitles
        if (subtitles.length > 0) {
            updateSubtitleDisplay(currentTime);
        }
    }

    function updateBufferProgress() {
        if (videoPlayer.buffered.length > 0) {
            const bufferedEnd = videoPlayer.buffered.end(videoPlayer.buffered.length - 1);
            const duration = videoPlayer.duration;
            if (duration > 0) {
                const bufferedPercentage = (bufferedEnd / duration) * 100;
                bufferedBar.style.width = `${bufferedPercentage}%`;
            }
        }
    }

    function updateTotalTime() {
        if (!isNaN(videoPlayer.duration)) {
            totalTimeEl.textContent = formatTime(videoPlayer.duration);
        }
    }

    function handleSeek() {
        const seekTime = (seekSlider.value / 100) * videoPlayer.duration;
        videoPlayer.currentTime = seekTime;
    }

    function updateSeekTooltip(e) {
        const seekPos = (e.offsetX / seekSlider.offsetWidth);
        const seekTime = seekPos * videoPlayer.duration;
        timeTooltip.textContent = formatTime(seekTime);
        
        // Position tooltip
        const tooltipPos = e.offsetX - (timeTooltip.offsetWidth / 2);
        timeTooltip.style.left = `${tooltipPos}px`;
    }

    // Time formatting helper
    function formatTime(timeInSeconds) {
        if (isNaN(timeInSeconds)) return "00:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Show/hide controls
    function showControls() {
        const controlsContainer = document.querySelector('.controls-container');
        const videoOverlay = document.querySelector('.video-overlay');
        controlsContainer.style.opacity = '1';
        
        if (!isPlaying) {
            videoOverlay.style.opacity = '1';
        }
        
        clearTimeout(hideControlsTimeout);
        
        if (isPlaying) {
            startHideControlsTimer();
        }
    }

    function hideControls() {
        const controlsContainer = document.querySelector('.controls-container');
        const videoOverlay = document.querySelector('.video-overlay');
        
        // Only hide if not being hovered
        if (!controlsContainer.matches(':hover')) {
            controlsContainer.style.opacity = '0';
            videoOverlay.style.opacity = '0';
        }
    }

    function startHideControlsTimer() {
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(() => {
            if (isPlaying && !settingsPanel.classList.contains('show')) {
                hideControls();
            }
        }, 3000);
    }

    // Subtitle functions
    function toggleSubtitles() {
        subtitleSettings.enabled = !subtitleSettings.enabled;
        subtitleContainer.style.display = subtitleSettings.enabled ? 'block' : 'none';
        
        // Update the checkbox in settings panel to match
        const subtitleToggle = document.getElementById('subtitle-toggle');
        if (subtitleToggle) {
            subtitleToggle.checked = subtitleSettings.enabled;
        }
        
        saveSubtitleSettingsToLocalStorage();
        showToast(subtitleSettings.enabled ? "Subtitles enabled" : "Subtitles disabled");
    }

    function loadSubtitles(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            
            // Check if it's an SRT file
            if (file.name.endsWith('.srt')) {
                subtitles = parseSRT(content);
            } 
            // Check if it's a WebVTT file
            else if (file.name.endsWith('.vtt')) {
                subtitles = parseVTT(content);
            }
            
            // Apply settings and show subtitles
            subtitleSettings.enabled = true;
            applySubtitleSettings();
            
            // Update UI elements
            const subtitleToggle = document.getElementById('subtitle-toggle');
            if (subtitleToggle) {
                subtitleToggle.checked = true;
            }
            
            saveSubtitleSettingsToLocalStorage();
            showToast(`Loaded subtitles from "${file.name}"`);
        };
        reader.readAsText(file);
    }

    function parseSRT(srtContent) {
        const srtItems = [];
        const srtRegex = /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n\d+|\r?\n\r?\n$|$)/g;
        
        let match;
        while ((match = srtRegex.exec(srtContent)) !== null) {
            srtItems.push({
                start: timeToSeconds(match[2]),
                end: timeToSeconds(match[3]),
                text: match[4].trim().replace(/\r?\n/g, '<br>')
            });
        }
        
        return srtItems;
    }

    function parseVTT(vttContent) {
        const vttItems = [];
        // Skip the WEBVTT header
        const vttText = vttContent.replace(/^WEBVTT\r?\n/, '');
        const vttRegex = /(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\r?\n([\s\S]*?)(?=\r?\n\r?\n|\r?\n$|$)/g;
        
        let match;
        while ((match = vttRegex.exec(vttText)) !== null) {
            vttItems.push({
                start: timeToSeconds(match[1]),
                end: timeToSeconds(match[2]),
                text: match[3].trim().replace(/\r?\n/g, '<br>')
            });
        }
        
        return vttItems;
    }

    function timeToSeconds(timeString) {
        const [time, milliseconds] = timeString.replace(',', '.').split('.');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds + (milliseconds ? parseFloat(`0.${milliseconds}`) : 0);
    }

    // Update subtitle display with delay applied
    function updateSubtitleDisplay(currentTime) {
        let currentSubtitle = null;
        const adjustedTime = currentTime - subtitleSettings.delay;
        
        for (const subtitle of subtitles) {
            if (adjustedTime >= subtitle.start && adjustedTime <= subtitle.end) {
                currentSubtitle = subtitle;
                break;
            }
        }
        
        if (currentSubtitle && subtitleSettings.enabled) {
            subtitleContainer.innerHTML = `<p>${currentSubtitle.text}</p>`;
            subtitleContainer.style.display = 'block';
        } else {
            subtitleContainer.innerHTML = '';
        }
    }

    // Apply all subtitle settings to the DOM
    function applySubtitleSettings() {
        // Apply font size
        subtitleContainer.style.fontSize = `${Math.max(0.8, subtitleSettings.fontSize)}rem`;
        
        // Apply background opacity and font color to any existing or future subtitles
        const subtitleStyle = document.createElement('style');
        subtitleStyle.id = 'subtitle-custom-style';
        
        // Remove any existing custom style
        const existingStyle = document.getElementById('subtitle-custom-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        subtitleStyle.textContent = `
            #subtitle-container p {
                background-color: rgba(0, 0, 0, ${subtitleSettings.bgOpacity});
                color: ${subtitleSettings.color};
            }
        `;
        
        document.head.appendChild(subtitleStyle);
        
        // Apply position
        if (subtitleSettings.position === 'top') {
            subtitleContainer.style.bottom = 'auto';
            subtitleContainer.style.top = '70px';
        } else {
            subtitleContainer.style.top = 'auto';
            subtitleContainer.style.bottom = '70px';
        }
        
        // Apply visibility
        subtitleContainer.style.display = subtitleSettings.enabled ? 'block' : 'none';
    }

    // Save subtitle settings to localStorage
    function saveSubtitleSettingsToLocalStorage() {
        try {
            localStorage.setItem('webXPlayerSubtitleSettings', JSON.stringify(subtitleSettings));
        } catch (error) {
            console.error('Error saving subtitle settings to local storage:', error);
        }
    }

    // Load subtitle settings from localStorage
    function loadSubtitleSettingsFromLocalStorage() {
        try {
            const storedSettings = localStorage.getItem('webXPlayerSubtitleSettings');
            if (storedSettings) {
                subtitleSettings = {...subtitleSettings, ...JSON.parse(storedSettings)};
            }
        } catch (error) {
            console.error('Error loading subtitle settings from local storage:', error);
        }
    }

    // Modified toggleSubtitles function to work with new settings
    function toggleSubtitles() {
        subtitleSettings.enabled = !subtitleSettings.enabled;
        subtitleContainer.style.display = subtitleSettings.enabled ? 'block' : 'none';
        
        // Update the checkbox in settings panel to match
        const subtitleToggle = document.getElementById('subtitle-toggle');
        if (subtitleToggle) {
            subtitleToggle.checked = subtitleSettings.enabled;
        }
        
        saveSubtitleSettingsToLocalStorage();
        showToast(subtitleSettings.enabled ? "Subtitles enabled" : "Subtitles disabled");
    }

    // Modified loadSubtitles function to apply settings after loading
    function loadSubtitles(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            
            // Check if it's an SRT file
            if (file.name.endsWith('.srt')) {
                subtitles = parseSRT(content);
            } 
            // Check if it's a WebVTT file
            else if (file.name.endsWith('.vtt')) {
                subtitles = parseVTT(content);
            }
            
            // Apply settings and show subtitles
            subtitleSettings.enabled = true;
            applySubtitleSettings();
            
            // Update UI elements
            const subtitleToggle = document.getElementById('subtitle-toggle');
            if (subtitleToggle) {
                subtitleToggle.checked = true;
            }
            
            saveSubtitleSettingsToLocalStorage();
            showToast(`Loaded subtitles from "${file.name}"`);
        };
        reader.readAsText(file);
    }

    // Playlist functions
    function handleMediaUpload(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        
        for (const file of files) {
            if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
                addToPlaylist(file);
            }
        }
        
        // Play the first file if nothing is playing
        if (currentMediaIndex === -1) {
            playlistItems.length > 0 && playMediaAtIndex(0);
        }
        
        savePlaylistToLocalStorage();
    }

    function addToPlaylist(file) {
        const objectURL = URL.createObjectURL(file);
        
        const playlistItem = {
            name: file.name,
            type: file.type,
            url: objectURL,
            isStream: false,
            isLocalFile: true
        };
        
        playlistItems.push(playlistItem);
        renderPlaylist();
        showToast(`Added "${file.name}" to playlist`);
    }

    function renderPlaylist() {
        playlist.innerHTML = '';
        
        playlistItems.forEach((item, index) => {
            const li = document.createElement('li');
            const iconClass = item.isStream 
                ? 'fas fa-globe' 
                : (item.type.startsWith('video') ? 'fas fa-film' : 'fas fa-music');
            
            li.innerHTML = `
                <i class="${iconClass}"></i>
                <span title="${item.name}">${truncateString(item.name, 25)}</span>
            `;
            
            if (index === currentMediaIndex) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', () => playMediaAtIndex(index));
            playlist.appendChild(li);
        });
    }

    function playMediaAtIndex(index) {
        if (index >= 0 && index < playlistItems.length) {
            currentMediaIndex = index;
            const item = playlistItems[index];
            
            try {
                videoPlayer.src = item.url;
                videoPlayer.load();
                playMedia();
                
                renderPlaylist();
                
                // Update format info
                updateFormatInfo();
            } catch (error) {
                console.error('Error playing media at index', index, error);
                showToast('Error playing this media file');
            }
        }
    }

    function handleMediaEnd() {
        if (currentMediaIndex < playlistItems.length - 1) {
            playMediaAtIndex(currentMediaIndex + 1);
        } else {
            stopMedia();
        }
    }

    // Local storage for playlist
    function savePlaylistToLocalStorage() {
        try {
            const storedPlaylist = playlistItems.map(item => {
                const storedItem = {
                    name: item.name,
                    type: item.type,
                    isStream: item.isStream
                };
                
                if (item.isStream) {
                    storedItem.url = item.url;
                }
                
                return storedItem;
            });
            
            localStorage.setItem('webXPlayerPlaylist', JSON.stringify(storedPlaylist));
        } catch (error) {
            console.error('Error saving playlist to local storage:', error);
        }
    }

    function loadPlaylistFromLocalStorage() {
        try {
            const storedPlaylist = localStorage.getItem('webXPlayerPlaylist');
            if (storedPlaylist) {
                const playlist = JSON.parse(storedPlaylist);
                
                // Filter out non-stream items since we can't recover the files
                playlistItems = playlist.filter(item => item.isStream);
                
                renderPlaylist();
            }
        } catch (error) {
            console.error('Error loading playlist from local storage:', error);
            playlistItems = [];
        }
    }

    // Theme functions
    function changeTheme(theme) {
        currentTheme = theme;
        updateTheme();
        showToast(`Theme changed to ${theme}`);
        
        // Update theme option UI
        themeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.theme === theme) {
                option.classList.add('selected');
            }
        });
        
        localStorage.setItem('webXPlayerTheme', theme);
    }

    function updateTheme() {
        if (currentTheme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }

    // Quality functions (simulated)
    function changeQuality(quality) {
        // This would actually change video source to different quality in a real implementation
        // Here we'll just simulate it with a toast
        qualityOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.quality === quality) {
                option.classList.add('selected');
            }
        });
        
        showToast(`Quality changed to ${quality}`);
    }

    // Keyboard shortcuts
    function handleKeyboardShortcut(e) {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                skipBackward();
                break;
            case 'ArrowRight':
                e.preventDefault();
                skipForward();
                break;
            case 'ArrowUp':
                e.preventDefault();
                videoPlayer.volume = Math.min(videoPlayer.volume + 0.1, 1);
                volumeSlider.value = videoPlayer.volume;
                updateVolumeIcon();
                break;
            case 'ArrowDown':
                e.preventDefault();
                videoPlayer.volume = Math.max(videoPlayer.volume - 0.1, 0);
                volumeSlider.value = videoPlayer.volume;
                updateVolumeIcon();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                toggleMute();
                break;
        }
    }

    // Toast notification
    function showToast(message) {
        toastContent.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // Add this function to update the format information display
    function updateFormatInfo() {
        const formatInfoElement = document.getElementById('current-format');
        
        if (videoPlayer.src) {
            // Get the current source URL
            const sourceUrl = videoPlayer.src;
            
            // Extract filename or domain
            let displayText = '';
            
            if (sourceUrl.startsWith('blob:')) {
                // For local files (blob URLs)
                const currentItem = playlistItems[currentMediaIndex];
                if (currentItem) {
                    displayText = `Playing: ${currentItem.name}`;
                } else {
                    displayText = 'Playing local file';
                }
            } else {
                // For URLs, extract domain or filename
                try {
                    const url = new URL(sourceUrl);
                    if (url.pathname.split('/').pop().includes('.')) {
                        // If URL has a filename
                        displayText = `Playing: ${url.pathname.split('/').pop()}`;
                    } else {
                        // If URL is a stream
                        displayText = `Streaming from: ${url.hostname}`;
                    }
                } catch (e) {
                    displayText = 'Playing media';
                }
            }
            
            formatInfoElement.textContent = displayText;
        } else {
            formatInfoElement.textContent = 'No media loaded';
        }
    }

    // Initialize
    initPlayer();
});
