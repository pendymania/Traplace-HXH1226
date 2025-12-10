// File: app/static/js/blocks.js
/**
 * Block management: style, validation, label editing, color changing, Project Save/Load, and UI Customization.
 */

/* =========================================
 * 🛠️ CUSTOM SERVER CONFIGURATION
 * ========================================= */
const CUSTOM_CONFIG = {
    allianceName: "HXH ALLIANCE",    // Custom Alliance Name
    serverName: "Kingdom #1234",           // Custom Server Name
    welcomeMessage: "Strategic Map Tool by Nomad",  // Subtitle
    logoFileName: "logo.png"               // File in app/static/img/
};
/* ========================================= */

import { state } from './state.js';
import { rot } from './dom.js';
import { recomputePaint } from './render.js';
import { posToCell } from './transform.js';
import { queueSaveToURL } from './urlState.js';
import { saveCheckpoint } from './history.js';
import { t } from './i18n.js';
import { onCreateBlock, onDeleteBlock } from './counters.js';

/* ---------------------------------------------
 * Styling & Colors
 * ------------------------------------------- */
const TOWN_COLORS = [
  null,                // 0: Default
  '#ff6b6b',           // 1: Red
  '#51cf66',           // 2: Green
  '#fcc419',           // 3: Yellow
  '#845ef7'            // 4: Purple
];

function applyBlockStyle(b, invalid) {
  const el = b.el;
  const styles = getComputedStyle(document.documentElement);

  if (invalid) {
    el.style.background = styles.getPropertyValue('--warn-bg');
    el.style.borderColor = styles.getPropertyValue('--warn-border');
    return;
  }

  if (b.kind === 'city' && b.customColorIndex) {
    const color = TOWN_COLORS[b.customColorIndex];
    if (color) {
      el.style.background = color;
      el.style.borderColor = 'rgba(0,0,0,0.3)';
      return;
    }
  }

  switch (b.kind) {
    case 'resource':
      el.style.background = styles.getPropertyValue('--resource-bg');
      el.style.borderColor = styles.getPropertyValue('--resource-border');
      return;
    case 'hq':
    case 'flag':
      el.style.background = styles.getPropertyValue('--flag-bg');
      el.style.borderColor = styles.getPropertyValue('--flag-border');
      return;
    case 'trap':
      el.style.background = styles.getPropertyValue('--trap-bg');
      el.style.borderColor = styles.getPropertyValue('--trap-border');
      return;
    case 'city':
      el.style.background = styles.getPropertyValue('--city-bg');
      el.style.borderColor = styles.getPropertyValue('--city-border');
      return;
    case 'castle':
      el.style.background = styles.getPropertyValue('--castle-bg');
      el.style.borderColor = styles.getPropertyValue('--castle-border');
      return;
    case 'turret':
      el.style.background = styles.getPropertyValue('--turret-bg');
      el.style.borderColor = styles.getPropertyValue('--turret-border');
      return;
    case 'fortress':
      el.style.background = styles.getPropertyValue('--fortress-bg');
      el.style.borderColor = styles.getPropertyValue('--fortress-border');
      return;
    case 'sanctuary':
      el.style.background = styles.getPropertyValue('--sanctuary-bg');
      el.style.borderColor = styles.getPropertyValue('--sanctuary-border');
      return;
    case 'block':
    case 'custom':
      el.style.background = styles.getPropertyValue('--block123-bg');
      el.style.borderColor = styles.getPropertyValue('--block123-border');
      return;
  }

  el.style.background = styles.getPropertyValue('--ok-bg');
  el.style.borderColor = styles.getPropertyValue('--ok-border');
}

/* ---------------------------------------------
 * Validation
 * ------------------------------------------- */
export function validateAllObjects() {
  for (const b of state.blocks) {
    const needsValidation = b.kind === 'city' || b.kind === 'trap';
    let invalid = false;

    if (needsValidation) {
      const { cx, cy } = posToCell(b.left, b.top);
      const width = b.kind === 'custom' ? b.width || b.size : b.size;
      const height = b.kind === 'custom' ? b.height || b.size : b.size;

      for (let y = cy; y < cy + height && !invalid; y++) {
        for (let x = cx; x < cx + width; x++) {
          if (!state.paintedSet.has(`${x},${y}`)) {
            invalid = true;
            break;
          }
        }
      }
    }
    applyBlockStyle(b, invalid);
  }
}

/* ---------------------------------------------
 * Label Editing
 * ------------------------------------------- */
function startEditLabel(blockEl) {
  const b = state.blocks.find((x) => x.el === blockEl);
  const editableKinds = ['city', 'custom', 'hq', 'trap', 'resource'];
  
  if (!b || !editableKinds.includes(b.kind)) return;

  const label = blockEl.querySelector('.label');
  if (!label) return;

  blockEl.dataset.editing = '1';
  b._labelOriginal = label.textContent;

  label.classList.add('editing');
  label.contentEditable = 'true';
  label.spellcheck = false;
  label.setAttribute('role', 'textbox');
  label.focus();

  requestAnimationFrame(() => {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(label);
    sel.removeAllRanges();
    sel.addRange(range);
  });

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditLabel(blockEl, false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishEditLabel(blockEl, true);
    }
  };
  const onBlur = () => finishEditLabel(blockEl, false);

  label.addEventListener('keydown', onKeyDown, { once: false });
  label.addEventListener('blur', onBlur, { once: true });

  b._labelHandlers = { onKeyDown, onBlur, labelEl: label };
}

function finishEditLabel(blockEl, cancel) {
  const b = state.blocks.find((x) => x.el === blockEl);
  const label = blockEl.querySelector('.label');
  if (!b || !label) return;

  let defaultLabel = '';
  if (b.kind === 'custom') {
    defaultLabel = `${b.width || b.size}×${b.height || b.size}`;
  } else {
    defaultLabel = t(`palette.${b.kind}`);
  }

  if (cancel) {
    label.textContent = b._labelOriginal ?? defaultLabel;
  } else {
    // ---------------------------------------------------------
    // CUSTOM LOGIC: Replace spaces with underscores
    // ---------------------------------------------------------
    let txt = (label.textContent || '').trim().replace(/\s+/g, '_');
    
    if (!txt) {
      label.textContent = defaultLabel;
      b.customLabel = false;
    } else if (txt === defaultLabel) {
      b.customLabel = false;
    } else {
      label.textContent = txt; // Update visual label
      b.customLabel = true;
    }
  }

  delete b._labelOriginal;
  label.classList.remove('editing');
  label.contentEditable = 'false';
  blockEl.removeAttribute('data-editing');

  if (b._labelHandlers) {
    const { onKeyDown, onBlur, labelEl } = b._labelHandlers;
    labelEl.removeEventListener('keydown', onKeyDown);
    labelEl.removeEventListener('blur', onBlur);
    delete b._labelHandlers;
  }

  queueSaveToURL();
  saveCheckpoint();
}

function cycleBlockColor(el) {
    const b = state.blocks.find((x) => x.el === el);
    if (!b || b.kind !== 'city') return;

    let idx = b.customColorIndex || 0;
    idx = (idx + 1) % TOWN_COLORS.length;
    b.customColorIndex = idx;

    applyBlockStyle(b, false);
    queueSaveToURL();
    saveCheckpoint();
}

/* ---------------------------------------------
 * CRUD
 * ------------------------------------------- */
export function createBlock(kind, size, left, top, width, height, immutable = false, customName = null, restoreData = null) {
  const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 48;
  const el = document.createElement('div');
  el.className = 'block';
  el.dataset.kind = kind;

  if (immutable) el.dataset.immutable = 'true';

  let blockWidth, blockHeight, displayText;
  if (kind === 'custom' && width && height) {
    blockWidth = width;
    blockHeight = height;
    el.dataset.size = String(Math.max(width, height));
    displayText = `${width}×${height}`;
  } else {
    blockWidth = blockHeight = size;
    el.dataset.size = String(size);

    if (customName) {
      displayText = customName;
    } else {
      // ---------------------------------------------------------
      // CUSTOM LOGIC: Default Name Format
      // ---------------------------------------------------------
      if (kind === 'city') {
        const cityCount = state.blocks.filter(b => b.kind === 'city').length + 1;
        const { cx, cy } = posToCell(left, top);
        // Format: Town_N_[x,y]_To_Be_Decided
        displayText = `Town_${cityCount}_[${cx},${cy}]_To_Be_Decided`;
      } else {
        displayText = t(`palette.${kind}`) || `${size}×${size}`;
      }
    }
  }

  el.style.width = `${blockWidth * cell}px`;
  el.style.height = `${blockHeight * cell}px`;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = displayText;
  el.appendChild(label);

  if (['city', 'custom', 'hq', 'trap', 'resource'].includes(kind)) {
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startEditLabel(el);
    });
  }
  if (kind === 'city') {
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        cycleBlockColor(el);
    });
  }

  rot.appendChild(el);

  const b = {
    el, kind, size: Math.max(blockWidth, blockHeight),
    left, top, customLabel: false,
  };

  // Restore Extra Data
  if (restoreData) {
      if (restoreData.customColorIndex) b.customColorIndex = restoreData.customColorIndex;
      if (restoreData.customLabel) b.customLabel = restoreData.customLabel;
  }

  if (kind === 'custom') { b.width = blockWidth; b.height = blockHeight; }
  if (immutable) { b.immutable = true; }
  
  state.blocks.push(b);
  applyBlockStyle(b, false);

  if (!state._restoring) {
    recomputePaint();
    validateAllObjects();
    queueSaveToURL();
    saveCheckpoint();
  }

  onCreateBlock(b);
  return el;
}

export function updateBlockPosition(el, snappedLeft, snappedTop) {
  el.style.left = `${snappedLeft}px`;
  el.style.top = `${snappedTop}px`;
  const b = state.blocks.find((x) => x.el === el);
  if (b) {
    b.left = snappedLeft; b.top = snappedTop;
    if (!state._restoring) {
      recomputePaint(); validateAllObjects(); queueSaveToURL(); saveCheckpoint();
    }
  }
}

export function updateBlockSize(el, newWidth, newHeight) {
  const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 48;
  el.style.width = `${newWidth * cell}px`;
  el.style.height = `${newHeight * cell}px`;
  const b = state.blocks.find((x) => x.el === el);
  if (b && b.kind === 'custom') {
    b.width = newWidth; b.height = newHeight; b.size = Math.max(newWidth, newHeight);
    const labelEl = el.querySelector('.label');
    if (labelEl && !b.customLabel) labelEl.textContent = `${newWidth}×${newHeight}`;
    if (!state._restoring) {
      recomputePaint(); validateAllObjects(); queueSaveToURL(); saveCheckpoint();
    }
  }
}

export function deleteBlock(el) {
  el.remove();
  const idx = state.blocks.findIndex((b) => b.el === el);
  if (idx >= 0) {
    const [removed] = state.blocks.splice(idx, 1);
    try { onDeleteBlock?.(removed); } catch {}
  }
  if (!state._restoring) {
    recomputePaint(); validateAllObjects(); queueSaveToURL(); saveCheckpoint();
  }
}

/* ---------------------------------------------
 * 🕒 Helper: Get Timestamp String
 * ------------------------------------------- */
function getTimestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}_${h}-${m}`;
}

/* ---------------------------------------------
 * 💾 PROJECT SAVE / LOAD (JSON)
 * ------------------------------------------- */
function saveProject() {
    const data = state.blocks
        .filter(b => !b.immutable)
        .map(b => {
            const labelEl = b.el.querySelector('.label');
            return {
                kind: b.kind,
                left: b.left,
                top: b.top,
                size: b.size,
                width: b.width,
                height: b.height,
                customName: labelEl ? labelEl.textContent : null,
                customLabel: b.customLabel,
                customColorIndex: b.customColorIndex
            };
        });
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `traplace_project_${getTimestamp()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function loadProject(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Invalid project file");
            state._restoring = true;
            for (let i = state.blocks.length - 1; i >= 0; i--) {
                if (!state.blocks[i].immutable) {
                    deleteBlock(state.blocks[i].el);
                }
            }
            data.forEach(item => {
                createBlock(
                    item.kind,
                    item.size,
                    item.left,
                    item.top,
                    item.width,
                    item.height,
                    false,
                    item.customName,
                    { 
                        customColorIndex: item.customColorIndex,
                        customLabel: item.customLabel 
                    }
                );
            });
            alert("Project loaded successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to load project file.");
        } finally {
            state._restoring = false;
            recomputePaint();
            validateAllObjects();
            queueSaveToURL();
            saveCheckpoint();
        }
    };
    reader.readAsText(file);
}

/* ---------------------------------------------
 * 📥 CSV IMPORT / EXPORT
 * ------------------------------------------- */
function downloadCSV() {
    const rows = [['Kind', 'Name', 'GridX', 'GridY', 'PixelLeft', 'PixelTop', 'Size', 'ColorIndex']];
    state.blocks.forEach(b => {
      if (b.immutable) return; 
      const { cx, cy } = posToCell(b.left, b.top);
      let name = '';
      const labelEl = b.el.querySelector('.label');
      if (labelEl) name = labelEl.textContent.trim();
      if (name.includes(',') || name.includes('"')) name = `"${name.replace(/"/g, '""')}"`;
      rows.push([b.kind, name, cx, cy, b.left, b.top, b.size, b.customColorIndex || 0]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `traplace_map_${getTimestamp()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function parseCSVLine(str) {
    const arr = [];
    let quote = false; let col = '';
    for (let c = 0; c < str.length; c++) {
        let cc = str[c]; let nc = str[c+1];
        if (cc === '"') {
            if (quote && nc === '"') { col += '"'; c++; } else { quote = !quote; }
        } else if (cc === ',' && !quote) {
            arr.push(col); col = '';
        } else { col += cc; }
    }
    arr.push(col);
    return arr;
}

function importCSV(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) return; 
    state._restoring = true;
    try {
        for (let i = state.blocks.length - 1; i >= 0; i--) {
            if (!state.blocks[i].immutable) deleteBlock(state.blocks[i].el);
        }
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = parseCSVLine(line);
            if (cols.length < 8) continue;
            const kind = cols[0];
            const name = cols[1];
            const left = parseFloat(cols[4]);
            const top = parseFloat(cols[5]);
            const size = parseFloat(cols[6]);
            const colorIdx = parseInt(cols[7]) || 0;
            if (isNaN(left) || isNaN(top)) continue;
            let w, h;
            if (kind === 'custom') { w = size; h = size; }
            createBlock(kind, size, left, top, w, h, false, name, { customColorIndex: colorIdx });
        }
    } finally {
        state._restoring = false;
        recomputePaint(); validateAllObjects(); queueSaveToURL(); saveCheckpoint();
        alert("CSV Import Complete!");
    }
}

/* ---------------------------------------------
 * 🛠️ UI CUSTOMIZATION & CLEANUP
 * ------------------------------------------- */
setTimeout(() => {
    // 1. Find the sidebar footer container (where "Created by" lives)
    const allDivs = document.querySelectorAll('div');
    let footerDiv = null;

    // Scan for the specific footer container
    for (const div of allDivs) {
        if (div.innerText.includes("Created by") && (div.innerText.includes("Toss") || div.innerText.includes("Buy me"))) {
            footerDiv = div;
            break;
        }
    }

    // 2. Replace Footer Content
    if (footerDiv) {
        footerDiv.innerHTML = ''; // Wipe old content
        
        // Apply styling
        Object.assign(footerDiv.style, {
            textAlign: 'center', padding: '15px 10px',
            borderTop: '1px solid #444', marginTop: '20px',
            color: '#ccc', fontSize: '0.9rem', lineHeight: '1.4'
        });

        // Inject new custom HTML
        footerDiv.innerHTML = `
            <div style="margin-bottom: 12px;">
                <h3 style="color: #fff; margin: 0 0 5px 0; font-size: 1.1rem;">${CUSTOM_CONFIG.allianceName}</h3>
                <div style="font-size: 0.85rem; opacity: 0.8; color: #845ef7; font-weight: bold;">${CUSTOM_CONFIG.serverName}</div>
                <div style="font-size: 0.75rem; opacity: 0.6;">${CUSTOM_CONFIG.welcomeMessage}</div>
            </div>
            
            <img src="/static/img/${CUSTOM_CONFIG.logoFileName}" 
                 alt="Logo" 
                 style="width: 80px; height: 80px; object-fit: contain; margin: 5px 0 15px 0; border-radius: 50%; background: #222; border: 2px solid #555;"
                 onerror="this.style.display='none'"> 
            
            <div style="font-size: 0.7rem; opacity: 0.5; border-top: 1px solid #333; padding-top: 10px;">
                original app by <a href="https://github.com/SangwoonYun/Traplace" target="_blank" style="color: #666; text-decoration: none;">SangwoonYun</a>
            </div>
        `;
    }
}, 500);

// 3. Add Import/Export/Save Buttons
const btnContainer = document.createElement('div');
Object.assign(btnContainer.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '9999',
    display: 'flex', gap: '8px', alignItems: 'center'
});

function createBtn(text, color, onClick) {
    const b = document.createElement('button');
    b.innerText = text;
    Object.assign(b.style, {
        padding: '10px 15px', background: color, color: 'white',
        border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    });
    b.onclick = onClick;
    return b;
}

btnContainer.appendChild(createBtn("💾 Save Project", "#6f42c1", saveProject));

const jsonInput = document.createElement('input');
jsonInput.type = 'file'; jsonInput.accept = '.json'; jsonInput.style.display = 'none';
jsonInput.onchange = (e) => { if(e.target.files[0]) loadProject(e.target.files[0]); e.target.value=''; };
btnContainer.appendChild(createBtn("📂 Open", "#5a32a3", () => jsonInput.click()));

const sep = document.createElement('div');
sep.style.width = "1px"; sep.style.height = "25px"; sep.style.background = "#ccc"; sep.style.margin = "0 8px";
btnContainer.appendChild(sep);

btnContainer.appendChild(createBtn("📥 Export CSV", "#28a745", downloadCSV));

const csvInput = document.createElement('input');
csvInput.type = 'file'; csvInput.accept = '.csv'; csvInput.style.display = 'none';
csvInput.onchange = (e) => { 
    if(!e.target.files[0]) return;
    const r = new FileReader();
    r.onload = (evt) => importCSV(evt.target.result);
    r.readAsText(e.target.files[0]);
    e.target.value=''; 
};
btnContainer.appendChild(createBtn("📤 Import CSV", "#007bff", () => csvInput.click()));

document.body.appendChild(btnContainer);