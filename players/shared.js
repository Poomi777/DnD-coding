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

// ─── State ───────────────────────────────────────────────
let abilities = [], inventory = [], notes = '', nextAbilityId = 1, nextItemId = 1;
let deletedDefaultIds = [];
let editingAbilityId = null, editingItemId = null;
let activeType = 'all', lbIndex = 0, filteredIds = [];
let itemModalCat = 'misc';
let trainingPoints = 200;
let training = [], nextTrainingId = 1, editingTrainingId = null;

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
      nextTrainingId = s.nextTrainingId || (Math.max(0, ...training.map(t=>t.id), 0) + 1);
      persist(); return;
    }
  } catch(e) {}
  abilities      = DEFAULT_ABILITIES.map(a=>({...a}));
  inventory      = DEFAULT_INVENTORY.map(i=>({...i}));
  training       = DEFAULT_TRAINING.map(t=>({...t}));
  nextAbilityId  = DEFAULT_ABILITIES.length + 1;
  nextItemId     = DEFAULT_INVENTORY.length + 1;
  nextTrainingId = DEFAULT_TRAINING.length + 1;
  persist();
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      abilities, inventory, notes, nextAbilityId, nextItemId, invVersion: INV_VERSION, deletedDefaultIds, trainingPoints,
      training, nextTrainingId,
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
    training, nextTrainingId,
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
      nextTrainingId    = data.nextTrainingId || (Math.max(0, ...training.map(t=>t.id), 0) + 1);
      persist(); buildFilters(); filterAbilities(); renderInventory(); renderTP(); renderTrainingList();
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
  initTrainingTab();
}

// ─── Spellcaster Mechanics rules tab ──────────────────────
function initRulesTab() {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="rules-tab" onclick="openRulesModal()"><i class="ti ti-book-2"></i><span>Spellcasting Rules</span></div>' +
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
function openLb(idx)  { lbIndex=idx; renderLb(); document.getElementById('lb').classList.add('open'); }
function closeLb()    { document.getElementById('lb').classList.remove('open'); }
function lbBgClick(e) { if(e.target===document.getElementById('lb')) closeLb(); }

function lbStep(dir) {
  const pos = filteredIds.indexOf(abilities[lbIndex].id);
  const np  = Math.max(0, Math.min(filteredIds.length-1, pos+dir));
  lbIndex   = abilities.findIndex(a=>a.id===filteredIds[np]);
  renderLb();
}

function renderLb() {
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
          <td>${esc(i.name)}${i.weaponRef
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
  if (e.key==='Escape') { closeLb(); closeAbilityModal(); closeArsenalModal(); closeItemModal(); closeRulesModal(); closeTrainingModal(); }
  if (!document.getElementById('lb').classList.contains('open')) return;
  if (e.key==='ArrowLeft')  lbStep(-1);
  if (e.key==='ArrowRight') lbStep(1);
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
