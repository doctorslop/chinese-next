/**
 * Audio playback for Pinyin syllables.
 * Minimal JavaScript - only handles click-to-play audio.
 */

(function() {
    'use strict';

    var currentAudio = null;

    function playAudio(audioUrl) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentAudio = new Audio(audioUrl);
        currentAudio.play().catch(function() {
            // Audio file may not exist - fail silently
        });
    }

    // Event delegation - walk up from target to find .pinyin-audio
    document.addEventListener('click', function(event) {
        var target = event.target;
        while (target && target !== document.body) {
            if (target.classList && target.classList.contains('pinyin-audio')) {
                event.preventDefault();
                var audioUrl = target.getAttribute('data-audio');
                if (audioUrl) playAudio(audioUrl);
                return;
            }
            target = target.parentElement;
        }
    });
})();
