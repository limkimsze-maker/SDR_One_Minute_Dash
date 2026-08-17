// HFW timer compatibility patch for One Minute Dash.
// The main app logic lives inline in index.html. This file is loaded with `defer`
// and adjusts only timer availability/defaults without replacing existing handlers.
(() => {
  'use strict';

  function setLabelText(input, text) {
    const label = input && input.closest('label');
    if (!label) return;

    let textNode = Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (!textNode) {
      textNode = document.createTextNode('');
      label.appendChild(textNode);
    }
    textNode.nodeValue = ` ${text}`;
  }

  function initHfwTimerPatch() {
    const modePBtn = document.getElementById('modeP');
    const modeHBtn = document.getElementById('modeH');
    const modeWBtn = document.getElementById('modeW');
    const timerOn = document.querySelector('input[name="timed"][value="on"]');
    const timerOff = document.querySelector('input[name="timed"][value="off"]');
    const timerControl = document.getElementById('timerControl');
    const startBtn = document.getElementById('startBtn');
    const startHint = document.getElementById('startHint');

    if (!modePBtn || !modeHBtn || !modeWBtn || !timerOn || !timerOff) return;

    setLabelText(timerOn, 'Timer ON (60s)');
    setLabelText(timerOff, 'Timer OFF (own time)');

    const timerHint = timerControl && timerControl.querySelector('.hint');
    if (timerHint) {
      timerHint.innerHTML = 'Timed <b>Phonogram</b> and <b>HFW</b> results are recorded to the chart.';
    }
    if (startHint) {
      startHint.textContent = 'Timed Phonogram and HFW results are saved automatically and added to the chart.';
    }

    function selectedMode() {
      if (modeHBtn.classList.contains('active')) return 'HFW';
      if (modeWBtn.classList.contains('active')) return 'W';
      return 'P';
    }

    function updateStartLabel() {
      if (!startBtn) return;
      startBtn.textContent = timerOn.checked ? '▶ Start 60s Dash' : '▶ Start untimed';
    }

    let lastMode = null;
    let syncQueued = false;

    function syncTimerForSelectedMode() {
      syncQueued = false;
      const mode = selectedMode();
      const enteringMode = mode !== lastMode;

      if (mode === 'W') {
        timerOn.disabled = true;
        timerOn.checked = false;
        timerOff.checked = true;
      } else {
        // Phonograms and HFW both support 60-second timed practice.
        timerOn.disabled = false;
        timerOff.disabled = false;

        // Default to timed whenever the user enters Phonograms or HFW.
        // The user can still switch to untimed afterwards.
        if (enteringMode) {
          timerOn.checked = true;
          timerOff.checked = false;
        }
      }

      lastMode = mode;
      updateStartLabel();
    }

    function queueSync() {
      if (syncQueued) return;
      syncQueued = true;
      queueMicrotask(syncTimerForSelectedMode);
    }

    [modePBtn, modeHBtn, modeWBtn].forEach(btn => {
      const observer = new MutationObserver(queueSync);
      observer.observe(btn, { attributes: true, attributeFilter: ['class'] });
    });

    timerOn.addEventListener('change', updateStartLabel);
    timerOff.addEventListener('change', updateStartLabel);

    // Run after the inline app's initialisation so HFW can immediately use 60s.
    syncTimerForSelectedMode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHfwTimerPatch, { once: true });
  } else {
    initHfwTimerPatch();
  }
})();
