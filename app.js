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

    // Initialize player
    function initPlayer() {
        updateTheme();
        setupEventListeners();
        loadPlaylistFromLocalStorage();
        loadUrlHistoryFromLocalStorage();
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
        videoContainer.addEventListener('mouseleave', startHideControlsTimer);
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
        document.querySelector('.controls-container').style.opacity = '1';
        clearTimeout(hideControlsTimeout);
        startHideControlsTimer();
    }

    function startHideControlsTimer() {
        hideControlsTimeout = setTimeout(() => {
            if (isPlaying) {
                document.querySelector('.controls-container').style.opacity = '0';
            }
        }, 3000);
    }

    // Subtitle functions
    function toggleSubtitles() {
        const subtitleStyle = subtitleContainer.style;
        if (subtitleStyle.display === 'none') {
            subtitleStyle.display = 'block';
            showToast("Subtitles enabled");
        } else {
            subtitleStyle.display = 'none';
            showToast("Subtitles disabled");
        }
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
            
            subtitleContainer.style.display = 'block';
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

    function updateSubtitleDisplay(currentTime) {
        let currentSubtitle = null;
        
        for (const subtitle of subtitles) {
            if (currentTime >= subtitle.start && currentTime <= subtitle.end) {
                currentSubtitle = subtitle;
                break;
            }
        }
        
        if (currentSubtitle) {
            subtitleContainer.innerHTML = `<p>${currentSubtitle.text}</p>`;
        } else {
            subtitleContainer.innerHTML = '';
        }
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

    // Initialize
    initPlayer();
});
