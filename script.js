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

    // Play local video file
    videoFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const videoUrl = URL.createObjectURL(file);
            videoPlayer.src = videoUrl;
            videoPlayer.load();
            resetSubtitles();
        }
    });

    // Play video from URL
    loadUrlButton.addEventListener('click', function() {
        const url = videoUrlInput.value.trim();
        if (url) {
            videoPlayer.src = url;
            videoPlayer.load();
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
        
        // If it's an SRT file, we need to convert it to VTT
        if (fileExtension === 'srt') {
            convertSrtToVtt(file, function(vttUrl) {
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
