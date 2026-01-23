/**
 * Audio playback for Pinyin syllables.
 * Minimal JavaScript - only handles click-to-play audio.
 */

(function() {
    'use strict';

    // Current audio element for cleanup
    var currentAudio = null;

    /**
     * Play audio for a pinyin syllable.
     * @param {string} audioUrl - URL to the audio file
     */
    function playAudio(audioUrl) {
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        // Create and play new audio
        currentAudio = new Audio(audioUrl);
        currentAudio.play().catch(function(e) {
            // Audio file may not exist - fail silently
            console.log('Audio not available:', audioUrl);
        });
    }

    /**
     * Handle click on pinyin audio links.
     */
    function handlePinyinClick(event) {
        var target = event.target;

        // Check if clicked element is a pinyin audio link
        if (target.classList.contains('pinyin-audio')) {
            event.preventDefault();

            var audioUrl = target.getAttribute('data-audio');
            if (audioUrl) {
                playAudio(audioUrl);
            }
        }
    }

    // Attach event listener using event delegation
    document.addEventListener('click', handlePinyinClick);

    // Also handle touch events for mobile
    document.addEventListener('touchend', function(event) {
        var target = event.target;
        if (target.classList.contains('pinyin-audio')) {
            event.preventDefault();
            var audioUrl = target.getAttribute('data-audio');
            if (audioUrl) {
                playAudio(audioUrl);
            }
        }
    });
})();
