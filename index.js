// One Minute Dash compatibility patch.
// The main app logic lives inline in index.html. This file is loaded with `defer`
// and adjusts timer availability plus chart recording without replacing existing handlers.
(() => {
  'use strict';

  const RECORDS_KEY = 'omd_records_v2';
  const OVERRIDES_KEY = 'omd_chart_overrides_v1';
  const TOTAL_CYCLES = 26;
  const SESSIONS_PER_CYCLE = 3;

  function safeJson(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

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

  function recordsFromStorage() {
    const list = safeJson(localStorage.getItem(RECORDS_KEY), []);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  function overridesFromStorage() {
    const obj = safeJson(localStorage.getItem(OVERRIDES_KEY), {});
    return obj && typeof obj === 'object' ? obj : {};
  }

  function latestRecord(records, mode, sid) {
    let latest = null;
    for (const rec of records) {
      if (!rec || rec.mode !== mode || rec.at !== sid) continue;
      if (!latest || Number(rec.t || 0) > Number(latest.t || 0)) latest = rec;
    }
    return latest;
  }

  function setChartCell(cell, value, sourceTitle) {
    if (!cell) return;
    const input = cell.querySelector('input[type="number"]');
    const displayValue = (value === '' || value == null || Number.isNaN(Number(value))) ? '' : String(value);

    if (input) {
      input.value = displayValue;
      input.title = sourceTitle;
    } else {
      cell.textContent = displayValue || '—';
      cell.title = sourceTitle;
    }
  }

  function applyLatestCompletedRecordsToChart() {
    const chartWrap = document.getElementById('chartWrap');
    const table = chartWrap && chartWrap.querySelector('table');
    if (!table) return;

    const records = recordsFromStorage();
    const overrides = overridesFromStorage();
    const allRows = Array.from(table.querySelectorAll('tr'));
    const dataRows = allRows.slice(2); // two header rows

    for (let cycle = 1; cycle <= TOTAL_CYCLES; cycle++) {
      const modes = ['P', 'HFW', 'W'];

      modes.forEach((mode, modeOffset) => {
        const row = dataRows[(cycle - 1) * 3 + modeOffset];
        if (!row) return;

        for (let session = 1; session <= SESSIONS_PER_CYCLE; session++) {
          const sid = `C${cycle}S${session}`;
          if (overrides[`${mode}::${sid}`]) continue; // manual chart values always win

          const rec = latestRecord(records, mode, sid);
          if (!rec) continue;

          // P rows have Cycle + Type before the six value cells.
          // HFW / Words rows have Type before the six value cells.
          const firstValueCell = modeOffset === 0 ? 2 : 1;
          const targetCell = row.cells[firstValueCell + (session - 1) * 2];
          const actualCell = row.cells[firstValueCell + (session - 1) * 2 + 1];
          const timing = rec.timed ? 'Timed 60s' : 'Untimed';
          const when = rec.t ? new Date(rec.t).toLocaleString() : '';
          const sourceTitle = `Latest completed ${mode} result · ${timing}${when ? ` · ${when}` : ''}`;

          setChartCell(targetCell, rec.target, sourceTitle);
          setChartCell(actualCell, rec.correct, sourceTitle);
        }
      });
    }
  }

  function updateChartCopy() {
    const chartWrap = document.getElementById('chartWrap');
    const panel = chartWrap && chartWrap.closest('.panel');
    if (panel) {
      const heading = Array.from(panel.querySelectorAll('h3')).find(h => h.textContent.includes('P3 SDR One Minute Dash Chart'));
      if (heading) heading.textContent = 'P3 SDR One Minute Dash Chart (Latest completed result — Target vs Actual)';
    }

    const resultHint = Array.from(document.querySelectorAll('#resultView .hint')).find(el => el.textContent.includes('Chart uses'));
    if (resultHint) {
      resultHint.innerHTML = 'Record storage: saved automatically to this browser (localStorage). Chart shows the <b>latest completed result</b> for each Cycle/Session and category.';
    }
  }

  function initCompatibilityPatch() {
    const modePBtn = document.getElementById('modeP');
    const modeHBtn = document.getElementById('modeH');
    const modeWBtn = document.getElementById('modeW');
    const timerOn = document.querySelector('input[name="timed"][value="on"]');
    const timerOff = document.querySelector('input[name="timed"][value="off"]');
    const timerControl = document.getElementById('timerControl');
    const startBtn = document.getElementById('startBtn');
    const startHint = document.getElementById('startHint');
    const chartWrap = document.getElementById('chartWrap');

    if (!modePBtn || !modeHBtn || !modeWBtn || !timerOn || !timerOff) return;

    setLabelText(timerOn, 'Timer ON (60s)');
    setLabelText(timerOff, 'Timer OFF (own time)');

    const timerHint = timerControl && timerControl.querySelector('.hint');
    if (timerHint) {
      timerHint.innerHTML = '<b>Phonograms</b> and <b>HFW</b> can be timed or untimed. Completed results are recorded to the chart.';
    }
    if (startHint) {
      startHint.textContent = 'Completed results are saved automatically and added to the chart.';
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

    // Whenever the inline app rebuilds the chart, replace its timed-only lookup
    // with the latest completed record from localStorage. This also restores
    // previously saved untimed HFW/Words attempts into the chart after refresh.
    if (chartWrap) {
      const chartObserver = new MutationObserver(() => {
        queueMicrotask(() => {
          applyLatestCompletedRecordsToChart();
          updateChartCopy();
        });
      });
      chartObserver.observe(chartWrap, { childList: true });
    }

    syncTimerForSelectedMode();
    applyLatestCompletedRecordsToChart();
    updateChartCopy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompatibilityPatch, { once: true });
  } else {
    initCompatibilityPatch();
  }
})();
