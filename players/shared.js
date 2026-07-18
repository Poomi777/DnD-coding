// Shared player sheet logic.
// Each player page must define these constants before loading this file:
//   PLAYER_NAME, CHAR, STORE_KEY, INV_VERSION, PURGE_IDS, DEFAULT_ABILITIES, DEFAULT_INVENTORY

const TYPES = {
  combat:    { color:'#ef4444', label:'Combat'    },
  magic:     { color:'#a855f7', label:'Magic'     },
  passive:   { color:'#22c55e', label:'Passive'   },
  utility:   { color:'#3b82f6', label:'Utility'   },
  reaction:  { color:'#f59e0b', label:'Reaction'  },
  legendary: { color:'#eab308', label:'Legendary' },
};

const HOMEBREW_WEAPONS = [
  { id:'repeating-crossbow', name:'Repeating Crossbow', type:'Martial Ranged · Homebrew',      accent:'#c9a84c', dmg:'3d6 + ability mod'   },
  { id:'scroll-bow',         name:'Scroll Bow',         type:'Martial Ranged · Arcane',         accent:'#5577aa', dmg:'1d8 + ability mod'   },
  { id:'adaption-blade',     name:'Adaption Blade',     type:'Martial Melee · Versatile',       accent:'#4a8f2a', dmg:'1d8 + ability mod'   },
  { id:'shock-axe',          name:'Shock Axe',          type:'Martial Melee · One-Handed',      accent:'#7c4de8', dmg:'2d6 + ability mod'   },
  { id:'impact-fang',        name:'Impact Fang',        type:'Ranged Sidearm · One-Handed',     accent:'#00b4d8', dmg:'1d8 + ability mod'   },
  { id:'charge-blade',       name:'Charge Blade',       type:'Melee · Versatile · Katana',      accent:'#cc2222', dmg:'1d8 + ability mod'   },
  { id:'tremor-warden',      name:'Tremor Warden',      type:'Arcane Staff · Versatile',        accent:'#00b894', dmg:'1d8 / 1d10 two-hand' },
  { id:'lumen',              name:'Lumen',              type:'Martial Melee · Spear',           accent:'#e8c020', dmg:'2d10 + ability mod'  },
];

const INV_CATS = [
  { key:'weapon',     label:'Weapons',         icon:'ti-sword'  },
  { key:'armor',      label:'Armor & Shields',  icon:'ti-shield' },
  { key:'consumable', label:'Consumables',      icon:'ti-flask'  },
  { key:'quest',      label:'Quest Items',      icon:'ti-star'   },
  { key:'misc',       label:'Miscellaneous',    icon:'ti-box'    },
];

const TRAINING_CATS = [
  { key:'ability',     label:'Ability',     color:'#ef4444' },
  { key:'spell',       label:'Spell',       color:'#a855f7' },
  { key:'trait',       label:'Trait',       color:'#3b82f6' },
  { key:'proficiency', label:'Proficiency', color:'#f59e0b' },
  { key:'other',       label:'Other',       color:'#64748b' },
];

const COMPANION_TYPES = {
  familiar: { label:'Familiar',         color:'#a855f7' },
  animal:   { label:'Animal Companion', color:'#22c55e' },
  summon:   { label:'Summon',           color:'#3b82f6' },
  npc:      { label:'NPC',              color:'#f59e0b' },
  other:    { label:'Other',            color:'#64748b' },
};

// ─── State ───────────────────────────────────────────────
let abilities = [], inventory = [], notes = '', nextAbilityId = 1, nextItemId = 1;
let deletedDefaultIds = [];
let editingAbilityId = null, editingItemId = null;
let activeType = 'all', lbIndex = 0, filteredIds = [];
let lbMode = 'ability', lbItemId = null, lbCompanionId = null;
let itemModalCat = 'misc';
let trainingPoints = 200;
let training = [], nextTrainingId = 1, editingTrainingId = null;
let companions = [], nextCompanionId = 1, editingCompanionId = null;

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.abilities)) {
      abilities         = s.abilities.filter(a => !PURGE_IDS.includes(a.id));
      deletedDefaultIds = s.deletedDefaultIds || [];
      DEFAULT_ABILITIES.forEach(da => {
        if (!deletedDefaultIds.includes(da.id) && !abilities.find(a => a.id === da.id))
          abilities.push({...da});
      });
      nextAbilityId = Math.max(s.nextAbilityId||1, ...abilities.map(a=>a.id+1), 1);
      if (s.invVersion === INV_VERSION && Array.isArray(s.inventory)) {
        inventory  = s.inventory;
        nextItemId = s.nextItemId || (Math.max(0, ...inventory.map(i=>i.id), 0) + 1);
      } else {
        inventory  = DEFAULT_INVENTORY.map(i=>({...i}));
        nextItemId = DEFAULT_INVENTORY.length + 1;
      }
      notes          = s.notes || '';
      trainingPoints = s.trainingPoints ?? 200;
      training = s.training || [];
      DEFAULT_TRAINING.forEach(dt => {
        if (!training.find(t => t.id === dt.id)) training.push({...dt});
      });
      nextTrainingId  = s.nextTrainingId  || (Math.max(0, ...training.map(t=>t.id),  0) + 1);
      companions      = s.companions || [];
      if (typeof DEFAULT_COMPANIONS !== 'undefined') {
        DEFAULT_COMPANIONS.forEach(dc => {
          const existing = companions.find(c => c.id === dc.id);
          if (!existing) { companions.push({...dc}); }
          else if (!existing.image && dc.image) { existing.image = dc.image; }
        });
      }
      nextCompanionId = s.nextCompanionId || (Math.max(0, ...companions.map(c=>c.id), 0) + 1);
      persist(); return;
    }
  } catch(e) {}
  abilities      = DEFAULT_ABILITIES.map(a=>({...a}));
  inventory      = DEFAULT_INVENTORY.map(i=>({...i}));
  training       = DEFAULT_TRAINING.map(t=>({...t}));
  companions     = typeof DEFAULT_COMPANIONS !== 'undefined' ? DEFAULT_COMPANIONS.map(c=>({...c})) : [];
  nextAbilityId  = DEFAULT_ABILITIES.length + 1;
  nextItemId     = DEFAULT_INVENTORY.length + 1;
  nextTrainingId = DEFAULT_TRAINING.length + 1;
  nextCompanionId = companions.length + 1;
  persist();
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      abilities, inventory, notes, nextAbilityId, nextItemId, invVersion: INV_VERSION, deletedDefaultIds, trainingPoints,
      training, nextTrainingId, companions, nextCompanionId,
    }));
  } catch(e) { toast('Storage full — some notes may not have saved'); }
}

// ─── Training Points ─────────────────────────────────────
function renderTP() {
  const el = document.getElementById('tp-val');
  if (el) el.textContent = trainingPoints;
}

function editTP() {
  const stat = document.getElementById('tp-stat');
  if (stat.querySelector('input')) return;
  const val = document.getElementById('tp-val');
  stat.removeEventListener('click', editTP);
  const inp = document.createElement('input');
  inp.type = 'number'; inp.min = 0; inp.value = trainingPoints;
  inp.className = 'tp-input';
  val.textContent = '';
  val.appendChild(inp);
  inp.focus(); inp.select();
  let done = false;
  function commit() {
    if (done) return; done = true;
    trainingPoints = Math.max(0, parseInt(inp.value) || 0);
    persist();
    stat.addEventListener('click', editTP);
    renderTP();
    toast(`Training Points: ${trainingPoints}`);
  }
  function cancel() {
    if (done) return; done = true;
    stat.addEventListener('click', editTP);
    renderTP();
  }
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { inp.removeEventListener('blur', commit); commit(); }
    if (e.key === 'Escape') { inp.removeEventListener('blur', commit); cancel(); }
  });
}

// ─── Export / Import ─────────────────────────────────────
function exportPlayerData() {
  const data = {
    version: 1, player: PLAYER_NAME, exported: new Date().toISOString(),
    abilities, inventory, notes, nextAbilityId, nextItemId,
    deletedDefaultIds, trainingPoints, invVersion: INV_VERSION,
    training, nextTrainingId, companions, nextCompanionId,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${PLAYER_NAME.toLowerCase()}-data-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`${PLAYER_NAME} data exported`);
}

function importPlayerData() {
  document.getElementById('import-file-input').click();
}

function handleImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.version || !Array.isArray(data.abilities)) throw new Error('Not a valid player data file');
      if (!confirm(`Import data from "${file.name}" into ${PLAYER_NAME}?\n\nThis will REPLACE all current abilities, inventory, notes, and Training Points.\nThis cannot be undone.`)) {
        input.value = ''; return;
      }
      abilities         = data.abilities || [];
      inventory         = data.inventory || [];
      notes             = data.notes || '';
      nextAbilityId     = data.nextAbilityId || (Math.max(0, ...abilities.map(a=>a.id), 0) + 1);
      nextItemId        = data.nextItemId || (Math.max(0, ...inventory.map(i=>i.id), 0) + 1);
      deletedDefaultIds = data.deletedDefaultIds || [];
      trainingPoints    = data.trainingPoints ?? 200;
      training          = data.training || [];
      nextTrainingId    = data.nextTrainingId    || (Math.max(0, ...training.map(t=>t.id),    0) + 1);
      companions        = data.companions || [];
      nextCompanionId   = data.nextCompanionId   || (Math.max(0, ...companions.map(c=>c.id),  0) + 1);
      persist(); buildFilters(); filterAbilities(); renderInventory(); renderTP(); renderTrainingList(); renderCompanions();
      document.getElementById('notes-ed').innerHTML = notes;
      toast(`${PLAYER_NAME} data imported`);
    } catch(e) { alert(`Import failed: ${e.message}`); }
    input.value = '';
  };
  reader.readAsText(file);
}

// ─── Training Tab ────────────────────────────────────────
function initTrainingTab() {
  const tabsEl = document.querySelector('.tabs');
  const btn = document.createElement('button');
  btn.className = 'tab';
  btn.innerHTML = '<i class="ti ti-dumbbell"></i> Training';
  btn.onclick = () => switchTab('training', btn);
  tabsEl.appendChild(btn);

  const page = document.querySelector('.page');
  const panel = document.createElement('div');
  panel.className = 'tab-panel';
  panel.id = 'tab-training';
  panel.innerHTML =
    '<div class="toolbar">' +
      '<span class="count" id="tr-count"></span>' +
      '<button class="add-btn" onclick="openTrainingModal()"><i class="ti ti-plus"></i> Add</button>' +
    '</div>' +
    '<div id="tr-list"></div>';
  page.appendChild(panel);

  const modal = document.createElement('div');
  modal.className = 'modal-ov';
  modal.id = 'training-modal';
  modal.onclick = e => { if (e.target === modal) closeTrainingModal(); };
  modal.innerHTML =
    '<div class="modal">' +
      '<div class="modal-head">' +
        '<span class="modal-title" id="tr-modal-title">Add Training</span>' +
        '<button class="modal-close" onclick="closeTrainingModal()"><i class="ti ti-x"></i></button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="mf" id="tr-name-f"><label>Name *</label><input id="tr-name" placeholder="e.g. Observation Training"></div>' +
        '<div class="mfg2">' +
          '<div class="mf"><label>Category</label>' +
            '<select id="tr-cat">' +
              '<option value="ability">Ability</option>' +
              '<option value="spell">Spell</option>' +
              '<option value="trait">Trait</option>' +
              '<option value="proficiency">Proficiency</option>' +
              '<option value="other">Other</option>' +
            '</select>' +
          '</div>' +
          '<div class="mf"><label>Progress</label>' +
            '<div class="tr-prog-inputs">' +
              '<input id="tr-progress" type="number" min="0" max="999" value="0">' +
              '<span class="tr-prog-sep">/</span>' +
              '<input id="tr-max" type="number" min="1" max="999" value="10">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mf"><label>Notes <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></label>' +
          '<textarea id="tr-notes" placeholder="What are you working on?" style="min-height:60px"></textarea>' +
        '</div>' +
      '</div>' +
      '<div class="modal-foot">' +
        '<button class="btn" onclick="closeTrainingModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveTraining()"><i class="ti ti-check"></i> <span id="tr-save-label">Add</span></button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  renderTrainingList();
}

function renderTrainingList() {
  const list = document.getElementById('tr-list');
  const countEl = document.getElementById('tr-count');
  if (!list) return;
  countEl.textContent = `${training.length} item${training.length !== 1 ? 's' : ''}`;
  if (!training.length) {
    list.innerHTML = '<div class="empty"><i class="ti ti-dumbbell"></i><p>No training tracked yet.<br>Add spells, abilities, or traits you\'re working on.</p></div>';
    return;
  }
  list.innerHTML = training.map(t => {
    const cat = TRAINING_CATS.find(c => c.key === t.category) || TRAINING_CATS[4];
    const pct = t.progressMax > 0 ? Math.min(100, Math.round(t.progress / t.progressMax * 100)) : 0;
    return `<div class="tr-card">
      <div class="tr-head">
        <div class="tr-title-row">
          <span class="tr-name">${esc(t.name)}</span>
          <span class="tr-cat-badge" style="--tcat:${cat.color}">${cat.label}</span>
        </div>
        <div class="tr-card-actions">
          <button class="tr-act-btn" onclick="openTrainingModal(${t.id})" title="Edit"><i class="ti ti-pencil"></i></button>
          <button class="tr-act-btn tr-del-btn" onclick="deleteTraining(${t.id})" title="Delete"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div class="tr-progress-row">
        <button class="tr-step-btn" onclick="adjustProgress(${t.id},-1)">−</button>
        <div class="tr-bar"><div class="tr-fill" style="width:${pct}%;background:${cat.color}"></div></div>
        <button class="tr-step-btn" onclick="adjustProgress(${t.id},1)">+</button>
        <span class="tr-frac" style="color:${cat.color}">${t.progress} / ${t.progressMax}</span>
      </div>
      ${t.notes ? `<div class="tr-notes">${esc(t.notes)}</div>` : ''}
    </div>`;
  }).join('');
}

function openTrainingModal(id) {
  editingTrainingId = id || null;
  const t = id ? training.find(x => x.id === id) : null;
  document.getElementById('tr-modal-title').textContent = t ? 'Edit Training' : 'Add Training';
  document.getElementById('tr-save-label').textContent  = t ? 'Save' : 'Add';
  document.getElementById('tr-name').value     = t?.name || '';
  document.getElementById('tr-cat').value      = t?.category || 'ability';
  document.getElementById('tr-progress').value = t?.progress ?? 0;
  document.getElementById('tr-max').value      = t?.progressMax ?? 10;
  document.getElementById('tr-notes').value    = t?.notes || '';
  document.getElementById('tr-name-f').classList.remove('invalid');
  document.getElementById('training-modal').classList.add('open');
  setTimeout(() => document.getElementById('tr-name').focus(), 80);
}

function closeTrainingModal() {
  const modal = document.getElementById('training-modal');
  if (modal) modal.classList.remove('open');
  editingTrainingId = null;
}

function saveTraining() {
  const name = document.getElementById('tr-name').value.trim();
  if (!name) { document.getElementById('tr-name-f').classList.add('invalid'); return; }
  const progress    = Math.max(0, parseInt(document.getElementById('tr-progress').value) || 0);
  const progressMax = Math.max(1, parseInt(document.getElementById('tr-max').value) || 10);
  const item = {
    id:          editingTrainingId || nextTrainingId++,
    name,
    category:    document.getElementById('tr-cat').value,
    progress:    Math.min(progress, progressMax),
    progressMax,
    notes:       document.getElementById('tr-notes').value.trim(),
  };
  if (editingTrainingId) {
    const idx = training.findIndex(t => t.id === editingTrainingId);
    if (idx >= 0) training[idx] = item;
  } else {
    training.push(item);
  }
  persist(); renderTrainingList(); closeTrainingModal();
}

function deleteTraining(id) {
  if (!confirm('Delete this training entry?')) return;
  training = training.filter(t => t.id !== id);
  persist(); renderTrainingList();
}

function adjustProgress(id, delta) {
  const t = training.find(x => x.id === id);
  if (!t) return;
  t.progress = Math.max(0, Math.min(t.progressMax, t.progress + delta));
  persist(); renderTrainingList();
}

// ─── Companions Tab ──────────────────────────────────────
let pendingCmpAbilities = [], nextPendingCmpAbId = 1;
let pendingCmpImage = '';

function resolveThresholds(level) {
  const l = Math.max(0, parseInt(level) || 0);
  return { t1: 8 + l, t2: 16 + l };
}
function fmtMod(n) { const v = parseInt(n) || 0; return (v >= 0 ? '+' : '') + v; }

function switchCmpTab(tab) {
  document.querySelectorAll('#companion-modal .cmp-mtab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('#companion-modal .cmp-mtab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === tab));
}

function renderPendingCmpAbilities() {
  const list = document.getElementById('cmp-ab-list');
  if (!list) return;
  if (!pendingCmpAbilities.length) {
    list.innerHTML = '<p style="font-size:12px;color:var(--muted);font-style:italic;margin:6px 2px 0">No abilities yet.</p>';
    return;
  }
  list.innerHTML = pendingCmpAbilities.map(ab => `
    <div class="cmp-ab-row">
      <div class="cmp-ab-head">
        <input class="cmp-ab-name" placeholder="Ability name *" value="${esc(ab.name)}" oninput="updatePendingCmpAb(${ab.id},'name',this.value)">
        <input class="cmp-ab-cost" placeholder="Cost (Passive, Action…)" value="${esc(ab.cost)}" oninput="updatePendingCmpAb(${ab.id},'cost',this.value)">
        <button class="cmp-ab-del" onclick="removePendingCmpAbility(${ab.id})" title="Remove"><i class="ti ti-x"></i></button>
      </div>
      <textarea class="cmp-ab-desc" placeholder="Description of the ability…" oninput="updatePendingCmpAb(${ab.id},'desc',this.value)">${esc(ab.desc)}</textarea>
    </div>`).join('');
}

function addPendingCmpAbility() {
  pendingCmpAbilities.push({ id: nextPendingCmpAbId++, name: '', cost: '', desc: '' });
  renderPendingCmpAbilities();
  const rows = document.querySelectorAll('.cmp-ab-row');
  if (rows.length) rows[rows.length - 1].querySelector('.cmp-ab-name').focus();
}

function removePendingCmpAbility(id) {
  pendingCmpAbilities = pendingCmpAbilities.filter(a => a.id !== id);
  renderPendingCmpAbilities();
}

function updatePendingCmpAb(id, field, val) {
  const ab = pendingCmpAbilities.find(a => a.id === id);
  if (ab) ab[field] = val;
}

function handleCmpImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    pendingCmpImage = ev.target.result;
    const prev = document.getElementById('cmp-img-preview');
    const ph   = document.getElementById('cmp-img-placeholder');
    const rmv  = document.getElementById('cmp-img-remove');
    prev.src = pendingCmpImage; prev.style.display = 'block';
    ph.style.display = 'none';
    rmv.style.display = '';
  };
  reader.readAsDataURL(file);
}

function removeCmpImage() {
  pendingCmpImage = '';
  const prev = document.getElementById('cmp-img-preview');
  const ph   = document.getElementById('cmp-img-placeholder');
  const rmv  = document.getElementById('cmp-img-remove');
  const inp  = document.getElementById('cmp-img-input');
  prev.src = ''; prev.style.display = 'none';
  ph.style.display = '';
  rmv.style.display = 'none';
  if (inp) inp.value = '';
}

function initCompanionsTab() {
  const tabsEl = document.querySelector('.tabs');
  const btn = document.createElement('button');
  btn.className = 'tab';
  btn.innerHTML = '<i class="ti ti-paw"></i> Companions';
  btn.onclick = () => switchTab('companions', btn);
  tabsEl.appendChild(btn);

  const page = document.querySelector('.page');
  const panel = document.createElement('div');
  panel.className = 'tab-panel';
  panel.id = 'tab-companions';
  panel.innerHTML =
    '<div class="toolbar">' +
      '<span class="count" id="cmp-count"></span>' +
      '<button class="add-btn" onclick="openCompanionModal()"><i class="ti ti-plus"></i> Add Companion</button>' +
    '</div>' +
    '<div class="card-grid" id="cmp-grid"></div>';
  page.appendChild(panel);

  const modal = document.createElement('div');
  modal.className = 'modal-ov';
  modal.id = 'companion-modal';
  modal.onclick = e => { if (e.target === modal) closeCompanionModal(); };
  modal.innerHTML =
    '<div class="modal" style="max-width:540px">' +
      '<div class="modal-head">' +
        '<span class="modal-title" id="cmp-modal-title">Add Companion</span>' +
        '<button class="modal-close" onclick="closeCompanionModal()"><i class="ti ti-x"></i></button>' +
      '</div>' +
      '<div class="cmp-mtabs">' +
        '<button class="cmp-mtab active" data-tab="overview" onclick="switchCmpTab(\'overview\')">Overview</button>' +
        '<button class="cmp-mtab" data-tab="stats"    onclick="switchCmpTab(\'stats\')">Stats</button>' +
        '<button class="cmp-mtab" data-tab="abilities" onclick="switchCmpTab(\'abilities\')">Abilities</button>' +
      '</div>' +
      // ── Overview panel ──
      '<div class="modal-body cmp-mtab-panel active" data-tab="overview">' +
        '<div class="mf">' +
          '<label>Portrait <span style="text-transform:none;font-weight:400">(optional)</span></label>' +
          '<div class="cmp-portrait-upload" id="cmp-portrait-wrap" onclick="document.getElementById(\'cmp-img-input\').click()">' +
            '<img id="cmp-img-preview" style="display:none;width:100%;max-height:160px;object-fit:cover;border-radius:5px">' +
            '<div id="cmp-img-placeholder"><i class="ti ti-photo" style="font-size:22px;margin-bottom:5px"></i><span>Click to upload image</span></div>' +
            '<input type="file" id="cmp-img-input" accept="image/*" style="display:none" onchange="handleCmpImageUpload(event)">' +
          '</div>' +
          '<button id="cmp-img-remove" class="btn" style="display:none;margin-top:6px;font-size:11px;padding:4px 10px" onclick="event.stopPropagation();removeCmpImage()"><i class="ti ti-x"></i> Remove image</button>' +
        '</div>' +
        '<div class="mfg2">' +
          '<div class="mf" id="cmp-name-f"><label>Name *</label><input id="cmp-name" placeholder="e.g. Luna"></div>' +
          '<div class="mf"><label>Type</label>' +
            '<select id="cmp-type">' +
              '<option value="familiar">Familiar</option>' +
              '<option value="animal">Animal Companion</option>' +
              '<option value="summon">Summon</option>' +
              '<option value="npc">NPC</option>' +
              '<option value="other">Other</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="mfg2">' +
          '<div class="mf"><label>Species / Race</label><input id="cmp-species" placeholder="e.g. Owl, Pseudodragon…"></div>' +
          '<div class="mf"><label>Level</label><input id="cmp-level" type="number" min="0" value="1" placeholder="1"></div>' +
        '</div>' +
        '<div class="mfg2">' +
          '<div class="mf"><label>Speed</label><input id="cmp-speed" placeholder="e.g. 30 ft., fly 60 ft."></div>' +
          '<div class="mf"><label>Armor Class</label><input id="cmp-ac" placeholder="e.g. 13"></div>' +
        '</div>' +
        '<div class="mf"><label>Resolve Points <span style="text-transform:none;font-weight:400">(max hits before going down)</span></label>' +
          '<input id="cmp-hpmax" type="number" min="1" value="5">' +
        '</div>' +
        '<div class="mf"><label>Notes</label>' +
          '<textarea id="cmp-notes" placeholder="Background, personality, bonds…" style="min-height:70px"></textarea>' +
        '</div>' +
      '</div>' +
      // ── Stats panel ──
      '<div class="modal-body cmp-mtab-panel" data-tab="stats">' +
        '<p style="font-size:11px;color:var(--muted);margin-bottom:12px">Enter attribute <b>modifiers</b> (e.g. +3 → 3, -1 → -1). CON is used for Resolve saves.</p>' +
        '<div class="cmp-attr-grid">' +
          '<div class="cmp-attr-cell"><label>STR</label><input id="cmp-str" type="number" value="0"></div>' +
          '<div class="cmp-attr-cell"><label>DEX</label><input id="cmp-dex" type="number" value="0"></div>' +
          '<div class="cmp-attr-cell"><label>CON</label><input id="cmp-con" type="number" value="0"></div>' +
          '<div class="cmp-attr-cell"><label>INT</label><input id="cmp-int" type="number" value="0"></div>' +
          '<div class="cmp-attr-cell"><label>WIS</label><input id="cmp-wis" type="number" value="0"></div>' +
          '<div class="cmp-attr-cell"><label>CHA</label><input id="cmp-cha" type="number" value="0"></div>' +
        '</div>' +
        '<p style="font-size:11px;color:var(--muted);margin:14px 0 6px">Saving throws — leave blank to match attribute modifier.</p>' +
        '<div class="cmp-attr-grid">' +
          '<div class="cmp-attr-cell"><label>STR</label><input id="cmp-sav-str" type="number" placeholder="auto"></div>' +
          '<div class="cmp-attr-cell"><label>DEX</label><input id="cmp-sav-dex" type="number" placeholder="auto"></div>' +
          '<div class="cmp-attr-cell"><label>CON</label><input id="cmp-sav-con" type="number" placeholder="auto"></div>' +
          '<div class="cmp-attr-cell"><label>INT</label><input id="cmp-sav-int" type="number" placeholder="auto"></div>' +
          '<div class="cmp-attr-cell"><label>WIS</label><input id="cmp-sav-wis" type="number" placeholder="auto"></div>' +
          '<div class="cmp-attr-cell"><label>CHA</label><input id="cmp-sav-cha" type="number" placeholder="auto"></div>' +
        '</div>' +
        '<div class="mf" style="margin-top:14px"><label>Resistances</label><input id="cmp-resistances" placeholder="e.g. Fire, Poison, Bludgeoning (non-magical)"></div>' +
        '<div class="mf"><label>Vulnerabilities</label><input id="cmp-vulnerabilities" placeholder="e.g. Thunder, Radiant"></div>' +
        '<div class="mf"><label>Immunities</label><input id="cmp-immunities" placeholder="e.g. Poison, Charmed, Frightened"></div>' +
      '</div>' +
      // ── Abilities panel ──
      '<div class="modal-body cmp-mtab-panel" data-tab="abilities">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<span style="font-size:12px;color:var(--muted)">Traits, attacks, special actions.</span>' +
          '<button class="add-btn" onclick="addPendingCmpAbility()"><i class="ti ti-plus"></i> Add</button>' +
        '</div>' +
        '<div id="cmp-ab-list"></div>' +
      '</div>' +
      '<div class="modal-foot">' +
        '<button class="btn" id="cmp-delete-btn" style="display:none;color:#fca5a5;border-color:rgba(239,68,68,.3)" onclick="deleteCompanion(editingCompanionId)"><i class="ti ti-trash"></i> Delete</button>' +
        '<div style="flex:1"></div>' +
        '<button class="btn" onclick="closeCompanionModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveCompanion()"><i class="ti ti-check"></i> <span id="cmp-save-label">Add</span></button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  renderCompanions();
}

function renderCompanions() {
  const grid = document.getElementById('cmp-grid');
  const countEl = document.getElementById('cmp-count');
  if (!grid) return;
  countEl.textContent = `${companions.length} companion${companions.length !== 1 ? 's' : ''}`;
  if (!companions.length) {
    grid.innerHTML = '<div class="empty"><i class="ti ti-paw"></i><p>No companions yet — add a familiar, animal companion, or NPC ally.</p></div>';
    return;
  }
  grid.innerHTML = companions.map(c => {
    const type   = COMPANION_TYPES[c.type] || COMPANION_TYPES.other;
    const hpMax  = Math.max(1, c.hpMax || 5);
    const hp     = Math.max(0, Math.min(hpMax, c.hp ?? hpMax));
    const hpFrac = hp / hpMax;
    const hpColor = hpFrac > 0.5 ? '#22c55e' : hpFrac > 0.25 ? '#f59e0b' : '#ef4444';
    const subLine = [c.species, c.speed].filter(Boolean).join(' · ');
    const pips = Array.from({length: Math.min(hpMax, 10)}, (_, i) =>
      `<div class="cmp-pip ${i < hp ? 'on' : 'off'}" style="${i < hp ? `background:${hpColor};border-color:${hpColor}` : ''}"></div>`
    ).join('') + (hpMax > 10 ? `<span style="font-size:9px;color:var(--muted);margin-left:2px">+${hpMax-10}</span>` : '');
    const lvlBadge = c.level ? `<span class="ac-cost">Lv.${c.level}</span>` : '';
    return `<div class="ac" style="--accent:${type.color}" onclick="openCompanionLb(${c.id})">
      <div class="ac-stripe"></div>
      <button class="ac-edit" onclick="event.stopPropagation();openCompanionModal(${c.id})" title="Edit"><i class="ti ti-pencil"></i></button>
      <button class="ac-del"  onclick="event.stopPropagation();deleteCompanion(${c.id})"    title="Delete"><i class="ti ti-trash"></i></button>
      ${c.image ? `<div class="cmp-card-portrait"><img src="${c.image}" alt="${esc(c.name)}"></div>` : ''}
      <div class="ac-body">
        <div class="ac-row1">
          <span class="ac-badge">${type.label}</span>
          ${c.ac ? `<span class="ac-cost">AC ${esc(String(c.ac))}</span>` : ''}
          ${lvlBadge}
        </div>
        <div class="ac-name">${esc(c.name)}</div>
        ${subLine ? `<div class="ac-sub">${esc(subLine)}</div>` : ''}
      </div>
      <div class="cmp-hp-row">
        <div class="cmp-hp-ctrl">
          <button class="cmp-hp-btn" onclick="event.stopPropagation();adjustCompanionHp(${c.id},-1)">−</button>
          <div style="display:flex;gap:3px;align-items:center;flex:1;justify-content:center;flex-wrap:wrap">${pips}</div>
          <button class="cmp-hp-btn" onclick="event.stopPropagation();adjustCompanionHp(${c.id},1)">+</button>
        </div>
        <div style="text-align:center;font-size:10px;font-weight:700;color:${hpColor};margin-top:3px">${hp} / ${hpMax} resolve</div>
      </div>
    </div>`;
  }).join('');
}

function openCompanionModal(id) {
  editingCompanionId = id || null;
  const c = id ? companions.find(x => x.id === id) : null;
  document.getElementById('cmp-modal-title').textContent  = c ? 'Edit Companion' : 'Add Companion';
  document.getElementById('cmp-save-label').textContent   = c ? 'Save' : 'Add';
  document.getElementById('cmp-delete-btn').style.display = c ? '' : 'none';
  // Overview
  document.getElementById('cmp-name').value    = c?.name    || '';
  document.getElementById('cmp-type').value    = c?.type    || 'familiar';
  document.getElementById('cmp-species').value = c?.species || '';
  document.getElementById('cmp-level').value   = c?.level   ?? 1;
  document.getElementById('cmp-speed').value   = c?.speed   || '';
  document.getElementById('cmp-ac').value      = c?.ac      || '';
  document.getElementById('cmp-hpmax').value   = c?.hpMax   ?? 5;
  document.getElementById('cmp-notes').value   = c?.notes   || '';
  // Stats
  document.getElementById('cmp-str').value          = c?.str          ?? 0;
  document.getElementById('cmp-dex').value          = c?.dex          ?? 0;
  document.getElementById('cmp-con').value          = c?.con          ?? 0;
  document.getElementById('cmp-int').value          = c?.int          ?? 0;
  document.getElementById('cmp-wis').value          = c?.wis          ?? 0;
  document.getElementById('cmp-cha').value          = c?.cha          ?? 0;
  document.getElementById('cmp-resistances').value    = c?.resistances    || '';
  document.getElementById('cmp-vulnerabilities').value = c?.vulnerabilities || '';
  document.getElementById('cmp-immunities').value     = c?.immunities     || '';
  // Saving throws (blank = auto from attr mod)
  const savFields = ['str','dex','con','int','wis','cha'];
  savFields.forEach(k => {
    const el = document.getElementById(`cmp-sav-${k}`);
    if (el) el.value = (c?.saves && c.saves[k] != null) ? c.saves[k] : '';
  });
  // Image
  pendingCmpImage = c?.image || '';
  const prev = document.getElementById('cmp-img-preview');
  const ph   = document.getElementById('cmp-img-placeholder');
  const rmv  = document.getElementById('cmp-img-remove');
  if (pendingCmpImage) { prev.src = pendingCmpImage; prev.style.display = 'block'; ph.style.display = 'none'; rmv.style.display = ''; }
  else                 { prev.src = ''; prev.style.display = 'none'; ph.style.display = ''; rmv.style.display = 'none'; }
  // Abilities
  pendingCmpAbilities = (c?.compAbilities || []).map((a, i) => ({ ...a, id: i + 1 }));
  nextPendingCmpAbId = pendingCmpAbilities.length + 1;
  document.getElementById('cmp-name-f').classList.remove('invalid');
  switchCmpTab('overview');
  document.getElementById('companion-modal').classList.add('open');
  setTimeout(() => { renderPendingCmpAbilities(); document.getElementById('cmp-name').focus(); }, 80);
}

function closeCompanionModal() {
  const m = document.getElementById('companion-modal');
  if (m) m.classList.remove('open');
  editingCompanionId = null;
}

function saveCompanion() {
  const name = document.getElementById('cmp-name').value.trim();
  if (!name) {
    switchCmpTab('overview');
    document.getElementById('cmp-name-f').classList.add('invalid');
    return;
  }
  const hpMax    = Math.max(1, parseInt(document.getElementById('cmp-hpmax').value) || 5);
  const existing = editingCompanionId ? companions.find(c => c.id === editingCompanionId) : null;
  const item = {
    id:             editingCompanionId || nextCompanionId++,
    name,
    type:           document.getElementById('cmp-type').value,
    species:        document.getElementById('cmp-species').value.trim(),
    level:          parseInt(document.getElementById('cmp-level').value) || 0,
    speed:          document.getElementById('cmp-speed').value.trim(),
    ac:             document.getElementById('cmp-ac').value.trim(),
    hpMax,
    hp:             existing ? Math.min(existing.hp, hpMax) : hpMax,
    str:            parseInt(document.getElementById('cmp-str').value) || 0,
    dex:            parseInt(document.getElementById('cmp-dex').value) || 0,
    con:            parseInt(document.getElementById('cmp-con').value) || 0,
    int:            parseInt(document.getElementById('cmp-int').value) || 0,
    wis:            parseInt(document.getElementById('cmp-wis').value) || 0,
    cha:            parseInt(document.getElementById('cmp-cha').value) || 0,
    resistances:    document.getElementById('cmp-resistances').value.trim(),
    vulnerabilities:document.getElementById('cmp-vulnerabilities').value.trim(),
    immunities:     document.getElementById('cmp-immunities').value.trim(),
    saves: (()=>{ const s={}; ['str','dex','con','int','wis','cha'].forEach(k=>{ const v=document.getElementById(`cmp-sav-${k}`).value; if(v!=='') s[k]=parseInt(v)||0; }); return s; })(),
    image:          pendingCmpImage,
    compAbilities:  pendingCmpAbilities.filter(a => a.name.trim()).map((a, i) => ({ id: i + 1, name: a.name.trim(), cost: a.cost.trim(), desc: a.desc.trim() })),
    notes:          document.getElementById('cmp-notes').value.trim(),
  };
  if (editingCompanionId) {
    const idx = companions.findIndex(c => c.id === editingCompanionId);
    if (idx >= 0) companions[idx] = item;
  } else {
    companions.push(item);
  }
  persist(); renderCompanions(); closeCompanionModal();
}

function deleteCompanion(id) {
  if (!confirm('Remove this companion?')) return;
  companions = companions.filter(c => c.id !== id);
  persist(); renderCompanions(); closeCompanionModal();
}

function adjustCompanionHp(id, delta) {
  const c = companions.find(x => x.id === id);
  if (!c) return;
  c.hp = Math.max(0, Math.min(c.hpMax, (c.hp ?? c.hpMax) + delta));
  persist(); renderCompanions();
}

// ─── Boot ────────────────────────────────────────────────
function boot() {
  loadState();
  document.title = `${PLAYER_NAME} — Player Sheet`;
  document.querySelectorAll('[data-player-name]').forEach(el => el.textContent = PLAYER_NAME);
  document.querySelectorAll('[data-player-initial]').forEach(el => el.textContent = PLAYER_NAME[0]);
  document.getElementById('arsenal-player-hint').textContent =
    `Select a weapon from the Homebrew Arsenal to add to ${PLAYER_NAME}'s inventory. These are the existing homebrew weapon cards.`;
  document.getElementById('char-sub').textContent =
    [CHAR.race, CHAR.class].filter(v => v && v !== '—').join(' · ') || '— · —';
  document.getElementById('char-stats').innerHTML =
    [['Class',CHAR.class],['Level',CHAR.level],['Race',CHAR.race],['HP',CHAR.hp],['AC',CHAR.ac],['Speed',CHAR.speed]]
    .map(([l,v])=>`<div class="cst"><span class="cst-l">${l}</span><span class="cst-v">${esc(String(v))}</span></div>`).join('');
  document.getElementById('char-stats').insertAdjacentHTML('beforeend',
    '<div class="cst tp-cst" id="tp-stat" title="Click to edit Training Points"><span class="cst-l"><i class="ti ti-dumbbell" style="font-size:8px;margin-right:2px;vertical-align:middle"></i>Train. Pts</span><span class="cst-v tp-val" id="tp-val"></span></div>');
  document.getElementById('tp-stat').addEventListener('click', editTP);
  renderTP();
  document.querySelector('.tabs').insertAdjacentHTML('beforebegin',
    '<div class="data-io-bar">' +
    '<span class="data-io-label"><i class="ti ti-database" style="font-size:10px;vertical-align:middle;margin-right:2px"></i>Player Data</span>' +
    '<button class="data-io-btn" onclick="exportPlayerData()" title="Export as JSON for backup or cross-device transfer"><i class="ti ti-download"></i> Export</button>' +
    '<button class="data-io-btn" onclick="importPlayerData()" title="Import from JSON file"><i class="ti ti-upload"></i> Import</button>' +
    '<input type="file" id="import-file-input" accept=".json" style="display:none" onchange="handleImportFile(this)"></div>');
  buildFilters();
  filterAbilities();
  renderInventory();
  initNotes();
  initRulesTab();
  initResolveRulesModal();
  initTrainingTab();
  initCompanionsTab();
}

// ─── Spellcaster Mechanics rules tab ──────────────────────
function initRulesTab() {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="rules-tabs-group">' +
      '<div class="rules-tab" onclick="openRulesModal()"><i class="ti ti-book-2"></i><span>Spellcasting Rules</span></div>' +
      '<div class="rules-tab" onclick="openResolveModal()"><i class="ti ti-shield-half"></i><span>Companion Resolve</span></div>' +
    '</div>' +
    '<div class="rules-modal-ov" id="rules-modal-ov" onclick="bgCloseRules(event)">' +
      '<div class="rules-modal">' +
        '<div class="rules-modal-head">' +
          '<span class="rules-modal-title"><i class="ti ti-book-2"></i> Spellcaster Mechanics</span>' +
          '<button class="rules-modal-close" onclick="closeRulesModal()"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="rules-modal-body">' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">🧙 Wizard</div>' +
            '<p>Wizards have a shared spellcasting pool for each spell level — so for example, at level 5 they can cast:</p>' +
            '<ul>' +
              '<li>4 lvl 1 spells per long rest</li>' +
              '<li>3 lvl 2 spells per long rest</li>' +
              '<li>2 lvl 3 spells per long rest</li>' +
              '<li>etc.</li>' +
            '</ul>' +
          '</div>' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">🔥 Sorcerer</div>' +
            '<p>Sorcerers have a specific amount of charges per spell per long rest — so for example:</p>' +
            '<ul>' +
              '<li>Fireball has 3 charges per long rest</li>' +
              '<li>Polymorph has 2 charges per long rest</li>' +
              '<li>Counterspell has 2 charges per long rest</li>' +
              '<li>etc.</li>' +
            '</ul>' +
          '</div>' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">😈 Warlock</div>' +
            '<p>Warlocks use spell slots as usual — except they recover all slots on a short rest too.</p>' +
            '<p>They can turn or create a spell into a cantrip. The number of times they can do this is equal to half their level. <em>(e.g. at level 6 you can have up to 3 cantrips that were created or turned into cantrips)</em></p>' +
            '<p>When Warlocks run out of spell slots, depending on their patron or making a deal with their patron, they can continue to cast spells… but at the cost of something.</p>' +
          '</div>' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">✨ Cleric</div>' +
            '<p>Clerics use spell slots as usual.</p>' +
            '<p>Clerics are able to spend time or actions to <strong>Pray</strong>. By praying they can improve one of their spells (add a mechanic, make it cost less, change or enhance some effects, etc.) — but this will cost <strong>Favor</strong> points (usually equal to the level of the spell).</p>' +
            '<p>Or, by praying, they can spend some of their Favor Points to restore spell slots. The level of the spell slot restored equals how much Favor is spent.</p>' +
            '<div class="rules-sub">' +
              '<div class="rules-sub-name">Favor</div>' +
              '<p>Favor can be gained through praying to whatever the cleric\'s religion/divinity is.</p>' +
              '<p>Favor can also be gained through certain actions (discuss with the DM when you think you could gain favor — alternatively, praying and reflecting on past actions can also be a way to gain favor).</p>' +
              '<p>On the flip side, Favor can also be lost due to certain actions that conflict with the religion/divinity\'s beliefs.</p>' +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>' +
    '</div>'
  );
}

function openRulesModal() { document.getElementById('rules-modal-ov').classList.add('open'); }
function closeRulesModal() { document.getElementById('rules-modal-ov').classList.remove('open'); }
function bgCloseRules(e) { if (e.target.id === 'rules-modal-ov') closeRulesModal(); }

function openResolveModal()  { document.getElementById('resolve-rules-ov').classList.add('open'); }
function closeResolveModal() { document.getElementById('resolve-rules-ov').classList.remove('open'); }

function initResolveRulesModal() {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="rules-modal-ov" id="resolve-rules-ov" onclick="if(event.target.id===\'resolve-rules-ov\')closeResolveModal()">' +
      '<div class="rules-modal">' +
        '<div class="rules-modal-head">' +
          '<span class="rules-modal-title"><i class="ti ti-shield-half"></i> Companion Resolve System</span>' +
          '<button class="rules-modal-close" onclick="closeResolveModal()"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="rules-modal-body">' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">🛡️ What is Resolve?</div>' +
            '<p>Companions don\'t track hit points in the traditional sense. Instead, they have <strong>Resolve Points</strong> — a measure of their endurance, focus, and will to keep fighting.</p>' +
            '<p>Each Resolve Point represents the companion\'s ability to shrug off or withstand one significant hit. When they run out, they go down.</p>' +
          '</div>' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">🎲 How Taking a Hit Works</div>' +
            '<p>Every time a companion takes damage, check the damage total against the tier thresholds and roll a <strong>CON saving throw</strong>:</p>' +
            '<div class="rules-resolve-table">' +
              '<div class="rules-resolve-row header">' +
                '<span>Damage Dealt</span><span>CON Save DC</span><span>On Fail</span>' +
              '</div>' +
              '<div class="rules-resolve-row">' +
                '<span>1 – 8</span><span>DC 10</span><span>−1 Resolve</span>' +
              '</div>' +
              '<div class="rules-resolve-row">' +
                '<span>9 – 16</span><span>DC 15</span><span>−1 Resolve</span>' +
              '</div>' +
              '<div class="rules-resolve-row">' +
                '<span>17+</span><span>DC 20</span><span>−1 Resolve</span>' +
              '</div>' +
            '</div>' +
            '<p><strong>Success:</strong> The companion weathers the blow — Resolve does not decrease.</p>' +
            '<p><strong>Failure:</strong> The hit lands properly — Resolve decreases by 1.</p>' +
            '<p><em>Note: The CON modifier is added to the saving throw roll as normal.</em></p>' +
          '</div>' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">⬆️ Level Scaling</div>' +
            '<p>As a companion grows in level, their endurance improves. Each level adds <strong>+1</strong> to each damage tier threshold:</p>' +
            '<div class="rules-resolve-table">' +
              '<div class="rules-resolve-row header">' +
                '<span>Level</span><span>DC 10 tier</span><span>DC 15 tier</span><span>DC 20 tier</span>' +
              '</div>' +
              '<div class="rules-resolve-row">' +
                '<span>Lv. 0 (base)</span><span>1–8</span><span>9–16</span><span>17+</span>' +
              '</div>' +
              '<div class="rules-resolve-row">' +
                '<span>Lv. 1</span><span>1–9</span><span>10–17</span><span>18+</span>' +
              '</div>' +
              '<div class="rules-resolve-row">' +
                '<span>Lv. 4</span><span>1–12</span><span>13–20</span><span>21+</span>' +
              '</div>' +
              '<div class="rules-resolve-row">' +
                '<span>Lv. N</span><span>1–(8+N)</span><span>(9+N)–(16+N)</span><span>(17+N)+</span>' +
              '</div>' +
            '</div>' +
            '<p><em>The exact thresholds for each companion are always shown in their detail view.</em></p>' +
          '</div>' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">💀 Reaching Zero</div>' +
            '<p>When a companion reaches <strong>0 Resolve</strong>, they go unconscious or are otherwise incapacitated — the specific outcome is up to the DM and the fiction of the moment.</p>' +
            '<p>Companions don\'t make death saving throws unless the DM decides otherwise. Recovery typically requires a short or long rest.</p>' +
          '</div>' +

          '<div class="rules-class">' +
            '<div class="rules-class-name">📋 Quick Reference</div>' +
            '<ul>' +
              '<li>Resolve Points = how many hits the companion can take</li>' +
              '<li>Every hit → roll CON save (DC based on damage tier)</li>' +
              '<li>Pass → no change. Fail → −1 Resolve</li>' +
              '<li>Level N adds N to every tier threshold</li>' +
              '<li>0 Resolve → companion goes down</li>' +
            '</ul>' +
          '</div>' +

        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ─── Abilities ───────────────────────────────────────────
function buildFilters() {
  const types = ['all', ...[...new Set(abilities.map(a=>a.type))]];
  document.getElementById('ab-filters').innerHTML = types.map(t => {
    if (t==='all') return `<button class="fbtn active" data-type="all" onclick="setType('all')">All</button>`;
    const cfg = TYPES[t]||{color:'#64748b',label:t};
    return `<button class="fbtn" data-type="${t}" onclick="setType('${t}')">${cfg.label}</button>`;
  }).join('');
}

function setType(type) {
  activeType = type;
  document.querySelectorAll('.fbtn').forEach(b => {
    const on = b.dataset.type === type;
    b.classList.toggle('active', on);
    if (on && type!=='all') { const c=(TYPES[type]||{color:'#64748b'}).color; b.style.cssText=`color:${c};border-color:${c}70;background:${c}18`; }
    else b.style.cssText='';
  });
  filterAbilities();
}

function filterAbilities() {
  const q = document.getElementById('ab-search').value.toLowerCase().trim();
  const vis = abilities.filter(a => {
    const mt = activeType==='all' || a.type===activeType;
    const ms = !q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q) || (TYPES[a.type]||{label:''}).label.toLowerCase().includes(q);
    return mt && ms;
  });
  filteredIds = vis.map(a=>a.id);
  document.getElementById('ab-count').textContent = `${vis.length} abilit${vis.length!==1?'ies':'y'}`;
  const grid = document.getElementById('ab-grid');
  if (!vis.length) {
    const msg = abilities.length ? 'No abilities match the current filter.' : 'No abilities yet — add one above.';
    grid.innerHTML = `<div class="empty"><i class="ti ${abilities.length ? 'ti-search-off' : 'ti-sparkles'}"></i><p>${msg}</p></div>`;
    return;
  }
  grid.innerHTML = vis.map(a => {
    const cfg = TYPES[a.type]||{color:'#64748b',label:a.type};
    const pips = a.usesMax>0 ? Array.from({length:a.usesMax},(_,i)=>`<span class="ac-pip${i<a.uses?' on':''}"></span>`).join('') : '';
    return `<div class="ac" style="--accent:${cfg.color}" onclick="openLb(${abilities.indexOf(a)})">
      <div class="ac-stripe"></div>
      <button class="ac-edit" onclick="event.stopPropagation();openAbilityModal(${a.id})" title="Edit"><i class="ti ti-pencil"></i></button>
      <button class="ac-del" onclick="event.stopPropagation();deleteAbility(${a.id})" title="Delete"><i class="ti ti-trash"></i></button>
      <div class="ac-body">
        <div class="ac-row1"><span class="ac-badge">${cfg.label}</span><span class="ac-cost">${esc(a.cost)}</span></div>
        <div class="ac-name">${esc(a.name)}</div>
        <div class="ac-sub">${esc(a.sub)}</div>
        <div class="ac-desc">${esc(a.desc)}</div>
      </div>
      <div class="ac-foot">
        ${a.usesMax>0
          ?`<div class="ac-pips">${pips}</div><span class="ac-note">${esc(a.recharge)}</span>`
          :`<span class="ac-note" style="font-style:italic">Always active</span>`}
      </div>
    </div>`;
  }).join('');
}

function deleteAbility(id) {
  if (!confirm('Delete this ability?')) return;
  if (DEFAULT_ABILITIES.some(d => d.id === id) && !deletedDefaultIds.includes(id))
    deletedDefaultIds.push(id);
  abilities = abilities.filter(a=>a.id!==id);
  persist(); buildFilters(); filterAbilities();
}

function openAbilityModal(abilityId) {
  editingAbilityId = (abilityId !== undefined) ? abilityId : null;
  if (editingAbilityId !== null) {
    const a = abilities.find(ab => ab.id === editingAbilityId);
    document.getElementById('af-name').value     = a.name;
    document.getElementById('af-sub').value      = a.sub;
    document.getElementById('af-type').value     = a.type;
    document.getElementById('af-cost').value     = (a.cost  === '—') ? '' : a.cost;
    document.getElementById('af-range').value    = (a.range === '—') ? '' : a.range;
    document.getElementById('af-save').value     = a.save || '';
    document.getElementById('af-uses').value     = a.usesMax;
    document.getElementById('af-recharge').value = (a.recharge === 'Always Active' || a.recharge === '—') ? '' : a.recharge;
    document.getElementById('af-desc').value     = a.desc;
    document.getElementById('ability-modal-title').textContent = 'Edit Ability';
    document.getElementById('af-save-label').textContent       = 'Save Changes';
  } else {
    ['af-name','af-sub','af-cost','af-range','af-save','af-desc','af-recharge'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('af-uses').value = 1;
    document.getElementById('af-type').value = 'combat';
    document.getElementById('ability-modal-title').textContent = 'Add Ability';
    document.getElementById('af-save-label').textContent       = 'Add Ability';
  }
  ['af-name-f','af-desc-f'].forEach(id=>document.getElementById(id).classList.remove('invalid'));
  document.getElementById('ability-modal').classList.add('open');
  setTimeout(()=>document.getElementById('af-name').focus(),80);
}
function closeAbilityModal() { document.getElementById('ability-modal').classList.remove('open'); }

function saveAbility() {
  const name = document.getElementById('af-name').value.trim();
  const desc = document.getElementById('af-desc').value.trim();
  let ok = true;
  document.getElementById('af-name-f').classList.toggle('invalid',!name); if(!name) ok=false;
  document.getElementById('af-desc-f').classList.toggle('invalid',!desc); if(!desc) ok=false;
  if (!ok) return;
  const usesMax = Math.max(0, parseInt(document.getElementById('af-uses').value)||0);
  const data = {
    name,
    sub:      document.getElementById('af-sub').value.trim()      || 'Custom Ability',
    type:     document.getElementById('af-type').value,
    cost:     document.getElementById('af-cost').value.trim()     || '—',
    range:    document.getElementById('af-range').value.trim()    || '—',
    save:     document.getElementById('af-save').value.trim(),
    usesMax,
    recharge: document.getElementById('af-recharge').value.trim() || (usesMax===0 ? 'Always Active' : '—'),
    desc,
  };
  if (editingAbilityId !== null) {
    const idx = abilities.findIndex(a => a.id === editingAbilityId);
    if (idx !== -1) {
      const curr = abilities[idx];
      abilities[idx] = { ...curr, ...data, uses: usesMax === curr.usesMax ? curr.uses : usesMax };
    }
  } else {
    abilities.push({ id: nextAbilityId++, ...data, uses: usesMax });
  }
  persist(); closeAbilityModal(); buildFilters(); filterAbilities();
  if (document.getElementById('lb').classList.contains('open')) renderLb();
}

// ─── Lightbox ────────────────────────────────────────────
function openLb(idx) { lbMode='ability'; lbIndex=idx; renderLb(); document.getElementById('lb').classList.add('open'); }
function openItemLb(id) { lbMode='item'; lbItemId=id; renderLb(); document.getElementById('lb').classList.add('open'); }
function openCompanionLb(id) { lbMode='companion'; lbCompanionId=id; renderLb(); document.getElementById('lb').classList.add('open'); }
function closeLb() { document.getElementById('lb').classList.remove('open'); lbMode='ability'; lbItemId=null; lbCompanionId=null; }
function lbBgClick(e) { if(e.target===document.getElementById('lb')) closeLb(); }

function lbStep(dir) {
  if (lbMode !== 'ability') return;
  const pos = filteredIds.indexOf(abilities[lbIndex].id);
  const np  = Math.max(0, Math.min(filteredIds.length-1, pos+dir));
  lbIndex   = abilities.findIndex(a=>a.id===filteredIds[np]);
  renderLb();
}

function renderLb() {
  if (lbMode === 'item')      { renderItemLb();      return; }
  if (lbMode === 'companion') { renderCompanionLb(); return; }
  const a   = abilities[lbIndex];
  const cfg = TYPES[a.type]||{color:'#64748b',label:a.type};
  const pos = filteredIds.indexOf(a.id);
  document.getElementById('lb-stripe').style.background = cfg.color;
  document.getElementById('lb-card').style.setProperty('--la', cfg.color);
  const stats = [];
  if(a.cost  && a.cost !=='—') stats.push({l:'Cost', v:a.cost });
  if(a.range && a.range!=='—') stats.push({l:'Range',v:a.range});
  if(a.save)                   stats.push({l:'Save', v:a.save });
  const pips = a.usesMax>0 ? Array.from({length:a.usesMax},(_,i)=>`<div class="lb-pip ${i<a.uses?'on':'off'}"></div>`).join('') : '';
  document.getElementById('lb-body').innerHTML = `
    <div class="lb-hd"><span class="lb-badge">${cfg.label}</span><span class="lb-rech">${esc(a.recharge)}</span></div>
    <div class="lb-name">${esc(a.name)}</div><div class="lb-sub">${esc(a.sub)}</div>
    <div class="lb-div"></div>
    ${stats.length?`<div class="lb-stats">${stats.map(s=>`<div class="lb-stat"><span class="lb-stat-l">${s.l}</span><span class="lb-stat-v">${esc(s.v)}</span></div>`).join('')}</div>`:''}
    <div class="lb-desc">${esc(a.desc)}</div>
    <div class="lb-div"></div>
    ${a.usesMax>0
      ?`<div class="lb-uses"><div style="display:flex;gap:5px">${pips}</div><span style="font-size:12px;color:var(--muted)">${a.uses}/${a.usesMax} · ${esc(a.recharge)}</span></div>`
      :`<span style="font-size:11px;color:var(--muted);font-style:italic">Passive — always active</span>`}
    <div class="lb-nav-row">
      <button class="lb-nbtn" onclick="lbStep(-1)" ${pos===0?'disabled':''}>← Prev</button>
      <span class="lb-pos">${pos+1} / ${filteredIds.length}</span>
      <button class="lb-nbtn" onclick="lbStep(1)"  ${pos===filteredIds.length-1?'disabled':''}>Next →</button>
    </div>`;
}

const INV_TYPE_META = {
  weapon:     { color:'#ef4444', label:'Weapon'       },
  armor:      { color:'#22c55e', label:'Armor'         },
  consumable: { color:'#a855f7', label:'Consumable'    },
  quest:      { color:'#f59e0b', label:'Quest Item'    },
  misc:       { color:'#64748b', label:'Miscellaneous' },
};

function renderItemLb() {
  const item = inventory.find(i => i.id === lbItemId);
  if (!item) { closeLb(); return; }
  const meta  = INV_TYPE_META[item.type] || INV_TYPE_META.misc;
  const parts = item.notes ? item.notes.split(' · ') : [];
  const isScroll = parts[0] && /spell scroll/i.test(parts[0]);
  const bodyParts = isScroll ? parts.slice(1) : parts;
  document.getElementById('lb-stripe').style.background = meta.color;
  document.getElementById('lb-card').style.setProperty('--la', meta.color);
  const statsHtml = bodyParts.length
    ? `<div class="lb-stats">${bodyParts.map(p=>`<div class="lb-stat" style="min-width:80px"><span class="lb-stat-v" style="font-size:12px;white-space:normal;text-align:left">${esc(p)}</span></div>`).join('')}</div>`
    : '';
  document.getElementById('lb-body').innerHTML = `
    <div class="lb-hd">
      <span class="lb-badge">${isScroll ? esc(parts[0]) : meta.label}</span>
      <span class="lb-rech">×${item.qty}</span>
    </div>
    <div class="lb-name">${esc(item.name)}</div>
    <div class="lb-div"></div>
    ${statsHtml}
    <div style="margin-top:${statsHtml?'8':'0'}px;display:flex;gap:8px">
      <button class="lb-nbtn" onclick="closeLb();openItemModal(null,${item.id})"><i class="ti ti-pencil" style="font-size:11px"></i> Edit</button>
    </div>`;
}

function renderCompanionLb() {
  const c = companions.find(x => x.id === lbCompanionId);
  if (!c) { closeLb(); return; }
  const type   = COMPANION_TYPES[c.type] || COMPANION_TYPES.other;
  const level  = Math.max(0, parseInt(c.level) || 0);
  const { t1, t2 } = resolveThresholds(level);
  const hpMax  = Math.max(1, c.hpMax || 5);
  const hp     = Math.max(0, Math.min(hpMax, c.hp ?? hpMax));
  const hpFrac = hp / hpMax;
  const hpColor = hpFrac > 0.5 ? '#22c55e' : hpFrac > 0.25 ? '#f59e0b' : '#ef4444';
  const subLine  = [c.species, c.speed].filter(Boolean).join(' · ');
  const hasSaves = c.saves && Object.keys(c.saves).length > 0;
  // Resolve pips (cap at 12 displayed)
  const pipCount = Math.min(hpMax, 12);
  const pips = Array.from({length: pipCount}, (_, i) =>
    `<div style="width:13px;height:13px;border-radius:50%;flex-shrink:0;background:${i<hp?hpColor:'var(--bg-e)'};border:1.5px solid ${i<hp?hpColor:'var(--bdr)'}"></div>`
  ).join('') + (hpMax > 12 ? `<span style="font-size:10px;color:var(--muted)">+${hpMax-12}</span>` : '');
  // Attribute + saves rows
  const attrs = ['str','dex','con','int','wis','cha'];
  const attrRow = `<div style="border:1px solid var(--bdr);border-radius:6px;overflow:hidden;margin-bottom:12px">
    <div style="display:flex;background:var(--bg-e);">
      ${attrs.map(a => `<div style="flex:1;text-align:center;padding:7px 2px;border-right:1px solid var(--bdr-d)">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:2px">${a.toUpperCase()}</div>
        <div style="font-size:13px;font-weight:700;color:${a==='con'?'var(--la)':'var(--txt)'}">${fmtMod(c[a]??0)}</div>
      </div>`).join('')}
    </div>
    ${hasSaves ? `<div style="display:flex;border-top:1px solid var(--bdr-d);">
      ${attrs.map(a => { const sv = (c.saves&&c.saves[a]!=null) ? c.saves[a] : (c[a]??0); const prof = c.saves&&c.saves[a]!=null; return `<div style="flex:1;text-align:center;padding:5px 2px;border-right:1px solid var(--bdr-d)">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:1px">save</div>
        <div style="font-size:11px;font-weight:700;color:${prof?'var(--la)':'var(--muted)'}">${fmtMod(sv)}</div>
      </div>`; }).join('')}
    </div>` : ''}
  </div>`;
  // Resolve system box
  const resolveBox = `<div class="cmp-resolve-box">
    <div class="cmp-resolve-title"><i class="ti ti-shield-half"></i> Resolve System${level?` — Level ${level}`:''}</div>
    <div class="cmp-resolve-tiers">
      <div class="cmp-resolve-tier"><span class="cmp-resolve-dc">DC 10</span><span class="cmp-resolve-range">1–${t1} dmg</span></div>
      <div class="cmp-resolve-tier"><span class="cmp-resolve-dc">DC 15</span><span class="cmp-resolve-range">${t1+1}–${t2} dmg</span></div>
      <div class="cmp-resolve-tier"><span class="cmp-resolve-dc">DC 20</span><span class="cmp-resolve-range">${t2+1}+ dmg</span></div>
    </div>
    <div class="cmp-resolve-note">CON save each time hit · Fail = −1 resolve · CON mod: <b>${fmtMod(c.con??0)}</b></div>
  </div>`;
  const hasTraits = c.resistances || c.vulnerabilities || c.immunities;
  const hasAbilities = c.compAbilities && c.compAbilities.length;
  document.getElementById('lb-stripe').style.background = type.color;
  document.getElementById('lb-card').style.setProperty('--la', type.color);
  document.getElementById('lb-body').innerHTML = `
    ${c.image ? `<div class="cmp-lb-portrait"><img src="${c.image}" alt="${esc(c.name)}"></div>` : ''}
    <div class="lb-hd">
      <span class="lb-badge">${type.label}</span>
      ${level ? `<span class="lb-rech">Lv. ${level}</span>` : ''}
    </div>
    <div class="lb-name">${esc(c.name)}</div>
    ${subLine ? `<div class="lb-sub">${esc(subLine)}</div>` : ''}
    <div class="lb-div"></div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:6px;font-weight:700">Resolve</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;max-width:200px">${pips}</div>
        <div style="font-size:11px;font-weight:700;color:${hpColor};margin-top:5px">${hp} / ${hpMax} points</div>
      </div>
      ${c.ac ? `<div style="text-align:center;background:var(--bg-e);border:1px solid var(--bdr);border-radius:8px;padding:8px 16px;flex-shrink:0">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:2px">AC</div>
        <div style="font-size:20px;font-weight:700;color:var(--txt);font-family:'Cinzel',serif">${esc(String(c.ac))}</div>
      </div>` : ''}
    </div>
    ${attrRow}
    ${resolveBox}
    ${hasTraits ? `<div class="lb-div"></div>
      ${c.resistances    ? `<div class="cmp-trait-row"><span class="cmp-trait-label">Resist</span><span class="cmp-trait-val">${esc(c.resistances)}</span></div>` : ''}
      ${c.vulnerabilities? `<div class="cmp-trait-row"><span class="cmp-trait-label">Vulnerable</span><span class="cmp-trait-val">${esc(c.vulnerabilities)}</span></div>` : ''}
      ${c.immunities     ? `<div class="cmp-trait-row"><span class="cmp-trait-label">Immune</span><span class="cmp-trait-val">${esc(c.immunities)}</span></div>` : ''}` : ''}
    ${hasAbilities ? `<div class="lb-div"></div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:8px;font-weight:700">Abilities</div>
      ${c.compAbilities.map(ab => `<div class="cmp-ability-block">
        <div class="cmp-ability-head">
          <span class="cmp-ability-name">${esc(ab.name)}</span>
          ${ab.cost ? `<span class="cmp-ability-cost">${esc(ab.cost)}</span>` : ''}
        </div>
        ${ab.desc ? `<div class="cmp-ability-desc">${esc(ab.desc)}</div>` : ''}
      </div>`).join('')}` : ''}
    ${c.notes ? `<div class="lb-div"></div><div class="lb-desc">${esc(c.notes)}</div>` : ''}
    <div class="lb-div"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button class="lb-nbtn" onclick="adjustCompanionHp(${c.id},-1);renderCompanionLb()">− Resolve</button>
      <button class="lb-nbtn" onclick="adjustCompanionHp(${c.id},1);renderCompanionLb()">+ Resolve</button>
      <button class="lb-nbtn" style="margin-left:auto" onclick="closeLb();openCompanionModal(${c.id})"><i class="ti ti-pencil" style="font-size:11px"></i> Edit</button>
    </div>`;
}

// ─── Inventory ───────────────────────────────────────────
function renderInventory() {
  document.getElementById('inv-body').innerHTML = INV_CATS.map(cat => {
    const items = inventory.filter(i=>i.type===cat.key);
    const addBtn = cat.key==='weapon'
      ? `<button class="inv-add-btn" onclick="openArsenalModal()"><i class="ti ti-bow-arrow"></i> Add from Arsenal</button>`
      : `<button class="inv-add-btn" onclick="openItemModal('${cat.key}')"><i class="ti ti-plus"></i> Add</button>`;
    return `<div class="inv-cat">
      <div class="inv-cat-head">
        <div class="inv-cat-title"><i class="ti ${cat.icon}"></i>${cat.label}</div>
        ${addBtn}
      </div>
      ${items.length ? `<div class="inv-table-wrap"><table class="inv-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Notes</th><th></th></tr></thead>
        <tbody>${items.map(i=>`<tr>
          <td><button class="inv-name-btn" onclick="openItemLb(${i.id})">${esc(i.name)}</button>${i.weaponRef
            ?`<a class="inv-arsenal" href="../../weapons/index.html" title="View in Weapons Arsenal" target="_blank"><i class="ti ti-bow-arrow" style="font-size:9px"></i> Arsenal</a>`
            :''}</td>
          <td><span class="inv-qty">×${i.qty}</span></td>
          <td>${i.notes?`<span class="inv-notes">${esc(i.notes)}</span>`:''}</td>
          <td><button class="inv-edit" onclick="openItemModal(null,${i.id})" title="Edit item"><i class="ti ti-pencil"></i></button><button class="inv-del" onclick="deleteItem(${i.id})" title="Remove item"><i class="ti ti-trash"></i></button></td>
        </tr>`).join('')}</tbody>
      </table></div>`
      : `<p class="inv-empty">No items${cat.key==='weapon'?' — use "Add from Arsenal" to equip a weapon.':'.'}</p>`}
    </div>`;
  }).join('');
}

function deleteItem(id) {
  if (!confirm('Remove this item?')) return;
  inventory = inventory.filter(i=>i.id!==id);
  persist(); renderInventory();
}

function openArsenalModal() {
  renderArsenalGrid();
  document.getElementById('arsenal-modal').classList.add('open');
}
function closeArsenalModal() { document.getElementById('arsenal-modal').classList.remove('open'); }

function renderArsenalGrid() {
  document.getElementById('arsenal-grid').innerHTML = HOMEBREW_WEAPONS.map(w => {
    const inInv = inventory.filter(i=>i.weaponRef===w.id);
    const countLabel = inInv.length ? `<div class="wp-in-inv">×${inInv.reduce((s,i)=>s+i.qty,0)} in inventory</div>` : '';
    return `<div class="wp" style="--wc:${w.accent}">
      <div class="wp-stripe"></div>
      <div class="wp-body">
        <div class="wp-name">${esc(w.name)}</div>
        <div class="wp-type">${esc(w.type)}</div>
        <div class="wp-dmg">${esc(w.dmg)}</div>
        ${countLabel}
        <button class="wp-add-btn" onclick="addWeaponFromArsenal('${w.id}')">
          <i class="ti ti-plus"></i> Add
        </button>
      </div>
    </div>`;
  }).join('');
}

function addWeaponFromArsenal(weaponId) {
  const w = HOMEBREW_WEAPONS.find(x=>x.id===weaponId);
  if (!w) return;
  inventory.push({ id:nextItemId++, name:w.name, qty:1, type:'weapon', notes:w.type, weaponRef:w.id });
  persist();
  renderArsenalGrid();
  renderInventory();
  toast(`${w.name} added to inventory`);
}

function openItemModal(cat, itemId) {
  editingItemId = (itemId !== undefined) ? itemId : null;
  const labels = { armor:'Armor & Shields', consumable:'Consumables', quest:'Quest Items', misc:'Miscellaneous' };
  if (editingItemId !== null) {
    const item = inventory.find(i => i.id === editingItemId);
    itemModalCat = item.type;
    document.getElementById('item-modal-title').textContent = `Edit — ${labels[item.type]||item.type}`;
    document.getElementById('if-name').value  = item.name;
    document.getElementById('if-qty').value   = item.qty;
    document.getElementById('if-type').value  = item.type;
    document.getElementById('if-notes').value = item.notes || '';
    document.getElementById('if-save-label').textContent = 'Save Changes';
  } else {
    itemModalCat = cat || 'misc';
    document.getElementById('item-modal-title').textContent = `Add — ${labels[itemModalCat]||itemModalCat}`;
    ['if-name','if-notes'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('if-qty').value  = 1;
    document.getElementById('if-type').value = itemModalCat;
    document.getElementById('if-save-label').textContent = 'Add Item';
  }
  document.getElementById('if-name-f').classList.remove('invalid');
  document.getElementById('item-modal').classList.add('open');
  setTimeout(()=>document.getElementById('if-name').focus(),80);
}
function closeItemModal() { document.getElementById('item-modal').classList.remove('open'); }

function saveItem() {
  const name = document.getElementById('if-name').value.trim();
  if (!name) { document.getElementById('if-name-f').classList.add('invalid'); return; }
  document.getElementById('if-name-f').classList.remove('invalid');
  const data = {
    name,
    qty:   Math.max(1, parseInt(document.getElementById('if-qty').value)||1),
    type:  document.getElementById('if-type').value,
    notes: document.getElementById('if-notes').value.trim(),
  };
  if (editingItemId !== null) {
    const idx = inventory.findIndex(i => i.id === editingItemId);
    if (idx !== -1) inventory[idx] = { ...inventory[idx], ...data };
  } else {
    inventory.push({ id: nextItemId++, ...data });
  }
  persist(); closeItemModal(); renderInventory();
}

// ─── Tabs + keyboard + utils ─────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
}

function bgClose(e, id) { if(e.target===document.getElementById(id)) document.getElementById(id).classList.remove('open'); }

document.addEventListener('keydown', e => {
  if (e.key==='Escape') { closeLb(); closeAbilityModal(); closeArsenalModal(); closeItemModal(); closeRulesModal(); closeResolveModal(); closeTrainingModal(); closeCompanionModal(); }
  if (!document.getElementById('lb').classList.contains('open')) return;
  if (lbMode === 'ability' && e.key==='ArrowLeft')  lbStep(-1);
  if (lbMode === 'ability' && e.key==='ArrowRight') lbStep(1);
});

document.addEventListener('keydown', e => {
  if (e.key!=='Enter' || e.target.tagName==='TEXTAREA' || e.target.tagName==='BUTTON' || e.target.isContentEditable) return;
  if (document.getElementById('ability-modal').classList.contains('open'))  { saveAbility();  e.preventDefault(); }
  else if (document.getElementById('item-modal').classList.contains('open')) { saveItem();     e.preventDefault(); }
  else if (document.getElementById('training-modal')?.classList.contains('open')) { saveTraining(); e.preventDefault(); }
});

function toast(msg) {
  const t = document.createElement('div');
  t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2400);
}

function esc(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function initNotes() {
  const ed = document.getElementById('notes-ed');
  ed.innerHTML = notes;
  let saveTimer;
  ed.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { notes = ed.innerHTML; persist(); }, 600);
  });
  ed.addEventListener('paste', e => {
    const items = [...(e.clipboardData?.items || [])];
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (!imgItem) return;
    e.preventDefault();
    const reader = new FileReader();
    reader.onload = ev => {
      const img = document.createElement('img');
      img.src = ev.target.result;
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        const r = sel.getRangeAt(0);
        r.deleteContents(); r.insertNode(img);
        r.setStartAfter(img); r.collapse(true);
        sel.removeAllRanges(); sel.addRange(r);
      } else { ed.appendChild(img); }
      notes = ed.innerHTML; persist();
    };
    reader.readAsDataURL(imgItem.getAsFile());
  });
}

function fmt(cmd) { document.getElementById('notes-ed').focus(); document.execCommand(cmd, false, null); }

boot();
