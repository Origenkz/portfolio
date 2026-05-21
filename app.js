(() => {
  const STORAGE = 'tasks_v1'
  const SETTINGS_KEY = 'tasks_settings_v1'
  let tasks = []
  let editingId = null
  let currentNotifTask = null
  let settings = {theme: 'light', size: 'standard', sortMode: 'custom'}
  // default language
  settings.language = settings.language || 'ru'

  const el = id => document.getElementById(id)
  const qs = sel => document.querySelector(sel)

  const newTaskBtn = el('newTaskBtn')
  const listEl = el('list')
  const sortSelect = el('sortSelect')
  const listSelect = el('listSelect')
  const newListBtn = el('newListBtn')
  const editor = el('editor')
  const form = el('taskForm')
  const cancelBtn = el('cancelBtn')
  const deleteBtn = el('deleteBtn')
  const photoPreview = el('photoPreview')
  const notifModal = el('notifModal')
  const notifTitle = el('notifTitle')
  const notifText = el('notifText')
  const markDone = el('markDone')
  const snoozeBtn = el('snooze')
  const listTypeModal = el('listTypeModal')
  const listTypeForm = el('listTypeForm')
  const cancelNewList = el('cancelNewList')
  const deleteListBtn = el('deleteListBtn')
  const mobileMenuBtn = el('mobileMenuBtn')
  const mobileDrawer = el('mobileDrawer')
  const mobileDrawerOverlay = el('mobileDrawerOverlay')
  const mobileDrawerClose = el('mobileDrawerClose')
  const mobileListMenu = el('mobileListMenu')
  const mobileNewListBtn = el('mobileNewListBtn')
  const mobileSettingsBtn = el('mobileSettingsBtn')
  const mobileSortSelect = el('mobileSortSelect')
  const activeListLabel = el('activeListLabel')

  function load(){
    try{tasks = JSON.parse(localStorage.getItem(STORAGE)||'[]')}catch(e){tasks=[]}
  }
  const LISTS_KEY = 'tasks_lists_v1'
  let lists = []
  let activeListId = null

  function loadLists(){
    try{ lists = JSON.parse(localStorage.getItem(LISTS_KEY)||'[]') }catch(e){ lists = [] }
    if(!lists || !lists.length){
      const id = 'l'+Date.now(); lists = [{id, name: 'Основной', type: 'regular'}]; localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
    }
    // restore activeList from settings or choose first
    activeListId = settings.activeListId || lists[0].id
    // ensure active exists
    if(!lists.find(l=>l.id===activeListId)) activeListId = lists[0].id
    applyChainMode()
    renderLists()
  }
  function saveLists(){ localStorage.setItem(LISTS_KEY, JSON.stringify(lists)) }
  function renderLists(){ 
    if(!listSelect) return
    listSelect.innerHTML=''
    lists.forEach(l=>{ 
      const opt=document.createElement('option')
      opt.value=l.id
      opt.textContent=l.name
      if(l.id===activeListId) opt.selected=true
      listSelect.appendChild(opt)
    })
    if(mobileListMenu){
      mobileListMenu.innerHTML = ''
      lists.forEach(l=>{
        const item = document.createElement('li')
        item.className = 'mobile-list-item'
        item.dataset.listId = l.id
        const name = document.createElement('span')
        name.className = 'list-name'
        name.textContent = l.name
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.textContent = '✕'
        remove.addEventListener('click', e=>{
          e.stopPropagation()
          if(lists.length <= 1) return
          if(!confirm(`Удалить список "${l.name}"? Все задачи будут удалены.`)) return
          tasks = tasks.filter(t=>t.listId!==l.id)
          lists = lists.filter(x=>x.id!==l.id)
          if(activeListId===l.id) activeListId = lists[0]?.id || null
          settings.activeListId = activeListId
          save(); saveLists(); saveSettings()
          applyChainMode(); renderLists(); render();
        })
        if(l.id===activeListId){
          item.classList.add('active')
          const activeBadge = document.createElement('span')
          activeBadge.className = 'list-active-badge'
          activeBadge.textContent = '✓'
          item.appendChild(activeBadge)
        }
        item.appendChild(name)
        item.appendChild(remove)
        item.addEventListener('click', ()=>{
          if(activeListId === l.id) return
          activeListId = l.id
          settings.activeListId = activeListId
          saveSettings()
          applyChainMode()
          renderLists()
          render()
          closeMobileDrawer()
        })
        mobileListMenu.appendChild(item)
      })
    }
    // active list label
    if(activeListLabel){
      const active = getActiveList()
      const prefix = (translations[settings.language]||translations.ru).currentListLabel || 'Текущий список'
      activeListLabel.textContent = active? `${prefix}: ${active.name}` : ''
    }
    // disable delete button if only one list
    if(deleteListBtn) deleteListBtn.disabled = lists.length <= 1
  }
  function getActiveList(){ return lists.find(l=>l.id===activeListId) }
  function applyChainMode(){ 
    const activeList = getActiveList()
    const body = document.body
    const isChain = activeList && activeList.type==='chain'
    if(isChain){ body.classList.add('chain-mode') } 
    else { body.classList.remove('chain-mode') }
    if(sortSelect) sortSelect.disabled = isChain
    if(mobileSortSelect) mobileSortSelect.disabled = isChain
  }
  function openMobileDrawer(){
    if(!mobileDrawer) return
    mobileDrawer.classList.remove('hidden')
    mobileDrawer.classList.add('open')
    mobileDrawer.setAttribute('aria-hidden','false')
  }
  function closeMobileDrawer(){
    if(!mobileDrawer) return
    mobileDrawer.classList.add('hidden')
    mobileDrawer.classList.remove('open')
    mobileDrawer.setAttribute('aria-hidden','true')
  }
  // ensure createdAt exists for older tasks
  function normalizeTasks(){
    tasks.forEach(t=>{
      if(!t.createdAt){
        if(t.id && t.id.startsWith('t')){ const ts = parseInt(t.id.slice(1)); if(!isNaN(ts)) t.createdAt = new Date(ts).toISOString(); else t.createdAt = new Date().toISOString() }
        else t.createdAt = new Date().toISOString()
      }
      if(!t.listId){ t.listId = lists && lists[0] ? lists[0].id : 'l0' }
    })
  }
  function loadSettings(){
    try{settings = Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'))}catch(e){}
    applyTheme(settings.theme)
    applySize(settings.size)
    // apply sort mode to UI select if exists
    const ss = document.getElementById('sortSelect')
    if(ss) ss.value = settings.sortMode || 'custom'
    const ms = document.getElementById('mobileSortSelect')
    if(ms) ms.value = settings.sortMode || 'custom'
    // language
    const ls = document.getElementById('langSelect')
    if(ls) ls.value = settings.language || 'ru'
  }
  function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) }

  const translations = {
    ru: {
      header: 'Задачи', newTask: 'Новая задача', newList: 'Новый список', deleteList: 'Удалить список', settings: 'Настройки',
      sort: {custom: 'По своему порядку', date: 'По дате создания', title: 'По названию'},
      editor: {newTitle: 'Новая задача', editTitle: 'Редактировать задачу', title: 'Заголовок', desc: 'Описание', deadline: 'Срок', notify: 'Уведомление', photo: 'Фото', save: 'Сохранить', cancel: 'Отмена', delete: 'Удалить'},
      listType: {title: 'Создать список', name: 'Название', type: 'Тип списка', regular: 'Обычный (свободная сортировка)', chain: 'Цепочный (последовательно)', create: 'Создать', cancel: 'Отмена'},
      notif: {title: 'Напоминание', markDone: 'Выполнено', snooze: 'Отложить 10 мин'},
      card: {edit: 'Ред.', complete: 'Выполнено', undo: 'Отменить', del: 'Удал.'},
      settingsLabels: {theme: 'Тема', size: 'Размер интерфейса', lang: 'Язык'},
      settingsOptions: {dark: 'Темная', light: 'Светлая', system: 'Системная', small: 'Маленький', standard: 'Стандартный', large: 'Большой'},
      currentListLabel: 'Текущий список',
      settingsButtons: {save: 'Сохранить', close: 'Закрыть'}
    },
    en: {
      header: 'Tasks', newTask: 'New task', newList: 'New list', deleteList: 'Delete list', settings: 'Settings',
      sort: {custom: 'Custom order', date: 'By creation date', title: 'By title'},
      editor: {newTitle: 'New task', editTitle: 'Edit task', title: 'Title', desc: 'Description', deadline: 'Deadline', notify: 'Notify', photo: 'Photo', save: 'Save', cancel: 'Cancel', delete: 'Delete'},
      settingsOptions: {dark: 'Dark', light: 'Light', system: 'System', small: 'Small', standard: 'Standard', large: 'Large'},
      listType: {title: 'Create list', name: 'Name', type: 'List type', regular: 'Regular (free order)', chain: 'Chain (sequential)', create: 'Create', cancel: 'Cancel'},
      notif: {title: 'Reminder', markDone: 'Done', snooze: 'Snooze 10 min'},
      card: {edit: 'Edit', complete: 'Done', undo: 'Undo', del: 'Delete'},
      settingsLabels: {theme: 'Theme', size: 'Interface size', lang: 'Language'},
      settingsOptions: {dark: 'Dark', light: 'Light', system: 'System', small: 'Small', standard: 'Standard', large: 'Large'},
      settingsButtons: {save: 'Save', close: 'Close'}
    },
    kk: {
      header: 'Міндеттер', newTask: 'Жаңа міндет', newList: 'Жаңа тізім', deleteList: 'Тізімді өшіру', settings: 'Баптаулар',
      sort: {custom: 'Өз ретімен', date: 'Құру күні бойынша', title: 'Атауы бойынша'},
      editor: {newTitle: 'Жаңа міндет', editTitle: 'Тапсырманы өзгерту', title: 'Атауы', desc: 'Сипаттамасы', deadline: 'Мерзімі', notify: 'Еске салу', photo: 'Сурет', save: 'Сақтау', cancel: 'Болдырмау', delete: 'Өшіру'},
      settingsOptions: {dark: 'Қараңғы', light: 'Жарық', system: 'Жүйелік', small: 'Кіші', standard: 'Әдепкі', large: 'Үлкен'},
      listType: {title: 'Тізім жасау', name: 'Атауы', type: 'Тізім түрі', regular: 'Әдеттегі (еркін рет)', chain: 'Тізбекті (реттік)', create: 'Құру', cancel: 'Болдырмау'},
      notif: {title: 'Еске салғыш', markDone: 'Орындалды', snooze: '10 мин кейін'},
      card: {edit: 'Өзгерту', complete: 'Орындалды', undo: 'Бас тарту', del: 'Өшіру'},
      settingsLabels: {theme: 'Тақырып', size: 'Интерфейс өлшемі', lang: 'Тіл'},
      settingsOptions: {dark: 'Қараңғы', light: 'Жарық', system: 'Жүйелік', small: 'Кіші', standard: 'Әдепкі', large: 'Үлкен'},
      settingsButtons: {save: 'Сақтау', close: 'Жабу'}
    }
  }

  function applyLanguage(){
    const lang = settings.language || 'ru'
    const t = translations[lang] || translations.ru
    // header and main buttons
    document.querySelector('h1').textContent = t.header
    if(newTaskBtn) newTaskBtn.textContent = t.newTask
    if(newListBtn) newListBtn.textContent = t.newList
    if(deleteListBtn) deleteListBtn.textContent = t.deleteList
    if(settingsBtn) settingsBtn.textContent = t.settings
    // sort options
    if(sortSelect){
      sortSelect.options[0].text = t.sort.custom
      sortSelect.options[1].text = t.sort.date
      sortSelect.options[2].text = t.sort.title
    }
    // settings labels
    const settingsFormEl = document.getElementById('settingsForm')
    if(settingsFormEl){
      const themeLabel = settingsFormEl.querySelector('label:nth-of-type(1)')
      const sizeLabel = settingsFormEl.querySelector('label:nth-of-type(2)')
      const langLabel = settingsFormEl.querySelector('label:nth-of-type(3)')
      if(themeLabel) themeLabel.firstChild.nodeValue = t.settingsLabels.theme
      if(sizeLabel) sizeLabel.firstChild.nodeValue = t.settingsLabels.size
      if(langLabel) langLabel.firstChild.nodeValue = t.settingsLabels.lang
      // theme options
      const themeSelect = settingsFormEl.querySelector('[name="theme"]')
      if(themeSelect){
        const themeOpts = themeSelect.options
        themeOpts[0].text = t.settingsOptions.light
        themeOpts[1].text = t.settingsOptions.dark
        themeOpts[2].text = t.settingsOptions.system
      }
      // size options
      const sizeSelect = settingsFormEl.querySelector('[name="size"]')
      if(sizeSelect){
        const sizeOpts = sizeSelect.options
        sizeOpts[0].text = t.settingsOptions.small
        sizeOpts[1].text = t.settingsOptions.standard
        sizeOpts[2].text = t.settingsOptions.large
      }
      // buttons
      const actions = settingsFormEl.querySelectorAll('.actions button')
      if(actions[0]) actions[0].textContent = t.settingsButtons.save
      if(actions[1]) actions[1].textContent = t.settingsButtons.close
    }
    // list type modal
    const listTypeFormEl = document.getElementById('listTypeForm')
    if(listTypeFormEl){
      const h = listTypeFormEl.querySelector('h2')
      if(h) h.textContent = t.listType.title
      const labels = listTypeFormEl.querySelectorAll('label')
      if(labels[0]) labels[0].firstChild.nodeValue = t.listType.name
      if(labels[1]) labels[1].firstChild.nodeValue = t.listType.type
      const opts = listTypeFormEl.querySelectorAll('select option')
      if(opts[0]) opts[0].textContent = t.listType.regular
      if(opts[1]) opts[1].textContent = t.listType.chain
      const actions = listTypeFormEl.querySelectorAll('.actions button')
      if(actions[0]) actions[0].textContent = t.listType.create
      if(actions[1]) actions[1].textContent = t.listType.cancel
    }
    // editor labels and buttons
    const editorForm = document.getElementById('taskForm')
    if(editorForm){
      const h = document.getElementById('editorTitle')
      if(h) h.textContent = editingId? t.editor.editTitle : t.editor.newTitle
      const elTitle = editorForm.querySelector('[name="title"]').parentElement
      const elDesc = editorForm.querySelector('[name="desc"]').parentElement
      const elDeadline = editorForm.querySelector('[name="deadline"]').parentElement
      const elNotify = editorForm.querySelector('[name="notify"]').parentElement
      const elPhoto = editorForm.querySelector('[name="photo"]').parentElement
      if(elTitle) elTitle.firstChild.nodeValue = t.editor.title
      if(elDesc) elDesc.firstChild.nodeValue = t.editor.desc
      if(elDeadline) elDeadline.firstChild.nodeValue = t.editor.deadline
      if(elNotify) elNotify.firstChild.nodeValue = t.editor.notify
      if(elPhoto) elPhoto.firstChild.nodeValue = t.editor.photo
      const actions = editorForm.querySelectorAll('.actions button')
      if(actions[0]) actions[0].textContent = t.editor.save
      if(actions[1]) actions[1].textContent = t.editor.cancel
      if(actions[2]) actions[2].textContent = t.editor.delete
    }
    // mobile drawer labels
    if(mobileMenuBtn) mobileMenuBtn.textContent = '☰'
    if(mobileNewListBtn) mobileNewListBtn.textContent = t.newList
    if(mobileSettingsBtn) mobileSettingsBtn.textContent = t.settings
    const drawerTitle = document.querySelector('.mobile-drawer-header h2')
    if(drawerTitle) drawerTitle.textContent = t.header === 'Tasks' ? 'Lists' : t.header === 'Міндеттер' ? 'Тізімдер' : 'Списки'
    if(mobileSortSelect){
      mobileSortSelect.options[0].text = t.sort.custom
      mobileSortSelect.options[1].text = t.sort.date
      mobileSortSelect.options[2].text = t.sort.title
    }
    // notif modal
    const nt = translations[lang].notif
    const notifTitleEl = document.getElementById('notifTitle')
    if(notifTitleEl) notifTitleEl.textContent = nt.title
    const markDoneBtn = document.getElementById('markDone')
    const snoozeBtnEl = document.getElementById('snooze')
    if(markDoneBtn) markDoneBtn.textContent = nt.markDone
    if(snoozeBtnEl) snoozeBtnEl.textContent = nt.snooze
    // rerender cards to update button labels
    render()
  }

  function applyTheme(theme){
    const body = document.body
    if(theme === 'system'){
      const useDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      body.setAttribute('data-theme', useDark? 'dark':'light')
    } else {
      body.setAttribute('data-theme', theme)
    }
  }
  function watchSystemTheme(){
    if(!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener?.('change', ()=>{ if(settings.theme==='system') applyTheme('system') })
  }
  function applySize(size){
    const body = document.body
    body.classList.remove('size-small','size-standard','size-large')
    // normalize old values
    if(size==='medium') size='standard'
    body.classList.add('size-'+(size||'standard'))
  }
  function save(){localStorage.setItem(STORAGE,JSON.stringify(tasks))}

  function format(dt){if(!dt) return ''
    const d = new Date(dt); return d.toLocaleString()
  }

  function render(){
    listEl.innerHTML = ''
    normalizeTasks()
    const activeList = getActiveList()
    const isChainMode = activeList && activeList.type === 'chain'
    
    let view = tasks.slice().filter(t=> t.listId === activeListId)

    // In chain mode, show full vertical sequence but lock future tasks until previous completed
    let currentTask = null
    if(isChainMode){
      currentTask = view.find(t=>!t.completed) || null
      // keep view order as-is (user order)
    } else {
      if(settings.sortMode === 'date'){
        view = view.slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))
      } else if(settings.sortMode === 'title'){
        view = view.slice().sort((a,b)=> (a.title||'').localeCompare(b.title||'', 'ru'))
      } // custom uses array order
    }

    view.forEach(t=>{
      const card = document.createElement('article');card.className='card'
      // locked if chain mode and not the current task and not already completed
      const locked = isChainMode && currentTask && (t.id !== currentTask.id) && !t.completed
      const isCurrent = isChainMode && currentTask && t.id === currentTask.id
      if(isCurrent) card.classList.add('chain-current')
      if(isChainMode) card.dataset.completed = t.completed
      if(locked) card.classList.add('locked')
      // make draggable if custom order (not in chain mode)
      if(!isChainMode && settings.sortMode === 'custom') card.setAttribute('draggable','true')
      else card.removeAttribute('draggable')
      if(t.photo) { const img = document.createElement('img'); img.src=t.photo; img.className='thumb'; card.appendChild(img) }
      const title = document.createElement('div'); title.className='title'; title.textContent = t.title || 'Без названия'
      const desc = document.createElement('div'); desc.className='muted'; desc.style.marginBottom='8px'; desc.textContent = t.desc || ''
      const meta = document.createElement('div'); meta.className='meta';
      const tr = translations[settings.language] || translations.ru
      meta.innerHTML = (t.completed?'<strong>'+ (tr.card.complete || 'Выполнено') +'</strong>':'')
        + (t.deadline?('<div class="muted">'+ (tr.editor.deadline || 'Срок') +': '+format(t.deadline)+'</div>'):'')
        + (t.notify?('<div class="muted">'+ (tr.editor.notify || 'Уведомить') +': '+format(t.notify)+'</div>'):'')
      const row = document.createElement('div'); row.className='row';
      const editBtn = document.createElement('button'); editBtn.onclick = ()=>openEditor(t.id)
      const trCard = (translations[settings.language] || translations.ru).card
      editBtn.textContent = trCard.edit
      const completeBtn = document.createElement('button'); completeBtn.textContent = t.completed? trCard.undo : trCard.complete; completeBtn.onclick = ()=>{ tasks = tasks.map(x=> x.id===t.id? Object.assign({},x,{completed:!x.completed}):x); save(); render() }
      const delBtn = document.createElement('button'); delBtn.textContent = trCard.del; delBtn.className='danger'; delBtn.onclick = ()=>{ if(confirm((translations[settings.language]||translations.ru).editor.delete + '?')){ tasks = tasks.filter(x=>x.id!==t.id); save(); render() }}
      // disable controls when locked in chain mode
      editBtn.disabled = !!locked
      completeBtn.disabled = !!locked
      delBtn.disabled = !!locked
      if(locked){ editBtn.title = 'Заблокировано'; completeBtn.title = 'Заблокировано'; delBtn.title = 'Заблокировано' }
      row.appendChild(editBtn); row.appendChild(completeBtn); row.appendChild(delBtn)
      card.dataset.id = t.id
      if(!isChainMode && settings.sortMode === 'custom') attachDragHandlers(card)
      card.appendChild(title); if(t.desc) card.appendChild(desc); card.appendChild(meta); card.appendChild(row)
      listEl.appendChild(card)
    })
  }

  // Drag & drop handlers
  let _dragSrcId = null
  function attachDragHandlers(card){
    card.addEventListener('dragstart', e=>{
      _dragSrcId = card.dataset.id
      e.dataTransfer.effectAllowed = 'move'
      try{ e.dataTransfer.setData('text/plain', _dragSrcId) }catch(err){}
      card.classList.add('dragging')
    })
    card.addEventListener('dragend', ()=>{ _dragSrcId = null; card.classList.remove('dragging'); document.querySelectorAll('.card.drag-over').forEach(n=>n.classList.remove('drag-over')) })
    card.addEventListener('dragover', e=>{ e.preventDefault(); card.classList.add('drag-over'); e.dataTransfer.dropEffect = 'move' })
    card.addEventListener('dragleave', ()=>{ card.classList.remove('drag-over') })
    card.addEventListener('drop', e=>{
      e.preventDefault(); card.classList.remove('drag-over')
      const srcId = _dragSrcId || e.dataTransfer.getData('text/plain')
      const dstId = card.dataset.id
      if(!srcId || !dstId || srcId === dstId) return
      // reorder tasks array: move src before dst's index
      const srcIndex = tasks.findIndex(x=>x.id===srcId)
      const dstIndex = tasks.findIndex(x=>x.id===dstId)
      if(srcIndex < 0 || dstIndex < 0) return
      const [item] = tasks.splice(srcIndex,1)
      const insertIndex = tasks.findIndex((x,i)=> i===dstIndex)
      tasks.splice(insertIndex,0,item)
      save(); render()
    })
  }

  function openEditor(id){
    editingId = id || null
    const isEdit = !!id
    const h = document.getElementById('editorTitle')
    const t = (translations[settings.language] || translations.ru).editor
    h.textContent = isEdit? t.editTitle : t.newTitle
    deleteBtn.classList.toggle('hidden', !isEdit)
    // clear preview and reset form; also clear any persisted photo data
    photoPreview.innerHTML = ''
    if(form){
      form.reset()
      try{ if(form.photo) form.photo.value = '' }catch(e){}
      form._photoData = null
    }
    if(isEdit){
      const t = tasks.find(x=>x.id===id)
      if(!t) return
      form.title.value = t.title
      form.desc.value = t.desc
      form.deadline.value = t.deadline? new Date(t.deadline).toISOString().slice(0,16):''
      form.notify.value = t.notify? new Date(t.notify).toISOString().slice(0,16):''
      if(t.photo){ const img=document.createElement('img'); img.src=t.photo; photoPreview.appendChild(img) }
    }
    editor.classList.remove('hidden')
  }

  function closeEditor(){ editingId=null; editor.classList.add('hidden') }

  form.photo.addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader(); r.onload = () => { photoPreview.innerHTML=''; const img=document.createElement('img'); img.src=r.result; photoPreview.appendChild(img); form._photoData = r.result }
    r.readAsDataURL(f)
  })

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const data = {
      id: editingId||('t'+Date.now()),
      title: form.title.value.trim(),
      desc: form.desc.value.trim(),
      deadline: form.deadline.value? new Date(form.deadline.value).toISOString():null,
      notify: form.notify.value? new Date(form.notify.value).toISOString():null,
      photo: form._photoData || null,
      completed: false,
      lastNotified: null
    }
    // attach current list
    data.listId = activeListId
    if(editingId){ tasks = tasks.map(t=> t.id===editingId? Object.assign({},t,data):t) } else { tasks.push(data) }
    save(); render(); closeEditor()
  })

  cancelBtn.addEventListener('click', ()=>closeEditor())
  deleteBtn.addEventListener('click', ()=>{
    if(!editingId) return
    if(confirm('Удалить задачу?')){ tasks = tasks.filter(x=>x.id!==editingId); save(); render(); closeEditor() }
  })

  newTaskBtn.addEventListener('click', ()=>openEditor())

  // Sort select handler: change mode and re-render
  if(sortSelect){
    sortSelect.addEventListener('change', ()=>{
      settings.sortMode = sortSelect.value
      saveSettings()
      render()
    })
  }

  // List select and create list
  if(listSelect){
    listSelect.addEventListener('change', ()=>{
      activeListId = listSelect.value
      settings.activeListId = activeListId
      saveSettings()
      applyChainMode()
      render()
    })
  }
  if(mobileMenuBtn){
    mobileMenuBtn.addEventListener('click', ()=>openMobileDrawer())
  }
  if(mobileDrawerOverlay){
    mobileDrawerOverlay.addEventListener('click', ()=>closeMobileDrawer())
  }
  if(mobileDrawerClose){
    mobileDrawerClose.addEventListener('click', ()=>closeMobileDrawer())
  }
  if(mobileNewListBtn){
    mobileNewListBtn.addEventListener('click', ()=>{
      closeMobileDrawer()
      listTypeForm.reset()
      listTypeModal.classList.remove('hidden')
    })
  }
  if(mobileSettingsBtn){
    mobileSettingsBtn.addEventListener('click', ()=>{
      closeMobileDrawer()
      settingsBtn.click()
    })
  }
  if(mobileSortSelect){
    mobileSortSelect.addEventListener('change', ()=>{
      settings.sortMode = mobileSortSelect.value
      if(sortSelect) sortSelect.value = mobileSortSelect.value
      saveSettings()
      render()
    })
  }
  if(newListBtn){
    newListBtn.addEventListener('click', ()=>{
      listTypeForm.reset()
      listTypeModal.classList.remove('hidden')
    })
  }
  
  if(cancelNewList){
    cancelNewList.addEventListener('click', ()=>{
      listTypeModal.classList.add('hidden')
    })
  }
  
  if(listTypeForm){
    listTypeForm.addEventListener('submit', e=>{
      e.preventDefault()
      const name = document.getElementById('newListName').value.trim()
      const type = document.getElementById('newListType').value
      if(!name) return
      const id = 'l'+Date.now()
      lists.push({id, name, type})
      saveLists()
      activeListId = id
      settings.activeListId = id
      saveSettings()
      applyChainMode()
      renderLists()
      render()
      listTypeModal.classList.add('hidden')
    })
  }

  if(deleteListBtn){
    deleteListBtn.addEventListener('click', ()=>{
      const activeList = lists.find(l=>l.id===activeListId)
      if(!activeList) return
      if(!confirm(`Удалить список "${activeList.name}"? Все задачи будут удалены.`)) return
      // remove all tasks from this list
      tasks = tasks.filter(t=>t.listId!==activeListId)
      // remove the list
      lists = lists.filter(l=>l.id!==activeListId)
      // switch to first list
      activeListId = lists[0].id
      settings.activeListId = activeListId
      save(); saveLists(); saveSettings()
      renderLists(); render()
    })
  }

  // Settings UI
  const settingsBtn = el('settingsBtn')
  const settingsModal = el('settingsModal')
  const settingsForm = document.getElementById('settingsForm')
  const closeSettings = el('closeSettings')

  settingsBtn.addEventListener('click', ()=>{
    // populate
    settingsForm.theme.value = settings.theme || 'light'
    settingsForm.size.value = settings.size || 'standard'
    if(settingsForm.lang) settingsForm.lang.value = settings.language || 'ru'
    settingsModal.classList.remove('hidden')
  })
  closeSettings.addEventListener('click', ()=> settingsModal.classList.add('hidden'))
  settingsForm.addEventListener('submit', e=>{
    e.preventDefault()
    settings.theme = settingsForm.theme.value
    settings.size = settingsForm.size.value
    // language
    if(settingsForm.lang) settings.language = settingsForm.lang.value
    saveSettings()
    applyTheme(settings.theme)
    applySize(settings.size)
    applyLanguage()
    settingsModal.classList.add('hidden')
  })

  // Notifications check
  function checkNotifications(){
    const now = Date.now()
    tasks.forEach(t=>{
      if(t.notify && !t.completed){
        const nt = new Date(t.notify).getTime()
        if(nt <= now && (!t.lastNotified || new Date(t.lastNotified).getTime() < nt)){
          t.lastNotified = new Date().toISOString()
          save()
          triggerNotification(t)
        }
      }
    })
  }

  function triggerNotification(t){
    currentNotifTask = t
    const nt = (translations[settings.language]||translations.ru).notif
    notifTitle.textContent = t.title || nt.title
    notifText.textContent = t.desc || ''
    notifModal.classList.remove('hidden')
    // Try System Notification
    if('Notification' in window){
      if(Notification.permission==='granted'){
        const sysTitle = t.title || ((translations[settings.language]||translations.ru).notif.title)
        const n = new Notification(sysTitle, {body: t.desc||'', icon: t.photo||undefined})
        n.onclick = ()=>window.focus()
      } else if(Notification.permission!=='denied'){
        Notification.requestPermission().then(p=>{ if(p==='granted'){ new Notification(t.title||((translations[settings.language]||translations.ru).notif.title),{body:t.desc||''}) } })
      }
    }
  }

  markDone.addEventListener('click', ()=>{
    if(!currentNotifTask) return
    tasks = tasks.map(t=> t.id===currentNotifTask.id? Object.assign({},t,{completed:true}):t)
    save()
    const activeList = getActiveList()
    if(activeList && activeList.type === 'chain'){
      render() // re-render to show next task in chain
    } else {
      render()
    }
    hideNotif()
  })
  function hideNotif(){ currentNotifTask=null; notifModal.classList.add('hidden') }
  snoozeBtn.addEventListener('click', ()=>{
    if(!currentNotifTask) return
    const t = tasks.find(x=>x.id===currentNotifTask.id)
    if(!t) return
    const nt = Date.now() + 10*60*1000
    t.notify = new Date(nt).toISOString()
    t.lastNotified = null
    save(); render(); hideNotif()
  })

  // Init
  load();
  loadSettings();
  applyLanguage();
  loadLists();
  render();
  watchSystemTheme();
  setInterval(checkNotifications,30*1000)
  checkNotifications()

  // Expose small helper to console for debugging
  window._tasksApp = {getTasks:()=>tasks, save, render}
})();
