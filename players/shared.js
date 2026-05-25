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

// ─── State ───────────────────────────────────────────────
let abilities = [], inventory = [], notes = '', nextAbilityId = 1, nextItemId = 1;
let deletedDefaultIds = [];
let editingAbilityId = null, editingItemId = null;
let activeType = 'all', lbIndex = 0, filteredIds = [];
let itemModalCat = 'misc';

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
      notes = s.notes || '';
      persist(); return;
    }
  } catch(e) {}
  abilities     = DEFAULT_ABILITIES.map(a=>({...a}));
  inventory     = DEFAULT_INVENTORY.map(i=>({...i}));
  nextAbilityId = DEFAULT_ABILITIES.length + 1;
  nextItemId    = DEFAULT_INVENTORY.length + 1;
  persist();
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      abilities, inventory, notes, nextAbilityId, nextItemId, invVersion: INV_VERSION, deletedDefaultIds,
    }));
  } catch(e) { toast('Storage full — some notes may not have saved'); }
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
  buildFilters();
  filterAbilities();
  renderInventory();
  initNotes();
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
  if (e.key==='Escape') { closeLb(); closeAbilityModal(); closeArsenalModal(); closeItemModal(); }
  if (!document.getElementById('lb').classList.contains('open')) return;
  if (e.key==='ArrowLeft')  lbStep(-1);
  if (e.key==='ArrowRight') lbStep(1);
});

document.addEventListener('keydown', e => {
  if (e.key!=='Enter' || e.target.tagName==='TEXTAREA' || e.target.tagName==='BUTTON' || e.target.isContentEditable) return;
  if (document.getElementById('ability-modal').classList.contains('open')) { saveAbility(); e.preventDefault(); }
  else if (document.getElementById('item-modal').classList.contains('open'))   { saveItem();    e.preventDefault(); }
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
