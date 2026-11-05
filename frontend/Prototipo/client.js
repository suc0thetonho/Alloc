(function () {
  'use strict';
  const A = window.Alloc;
  const $ = (selector) => document.querySelector(selector);
  let search = '';
  let filter = 'todas';
  let selectedCategory = 'Todas';
  let selectedMachine = null;
  let lastFocused = null;
  const categoryOrder = ['Escavação','Terraplenagem','Carga e movimentação','Nivelamento','Operação geral'];

  function categories(state) {
    const distinct = [...new Set(state.machines.map(m => m.category || A.categoryFromType(m.type)))];
    distinct.sort((a,b)=>{
      const ai=categoryOrder.indexOf(a),bi=categoryOrder.indexOf(b);
      return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b,'pt-BR');
    });
    return ['Todas', ...distinct];
  }

  function visibleMachines(state) {
    return state.machines.filter(m => {
      const status=A.machineStatus(m,state).key;
      const category=m.category||A.categoryFromType(m.type);
      const haystack=[m.name,m.brand,m.model,m.purpose,m.description,m.type,category].join(' ').toLocaleLowerCase('pt-BR');
      return (selectedCategory==='Todas'||selectedCategory===category)
        && (filter==='todas'||filter===status)
        && haystack.includes(search);
    });
  }

  function renderTabs(state) {
    const list=categories(state);
    if (!list.includes(selectedCategory)) selectedCategory='Todas';
    $('#categoryTabs').innerHTML=list.map(cat=>{
      const active=selectedCategory===cat;
      return `<button class="catalog-tab ${active?'active':''}" type="button" aria-pressed="${active}" data-category="${A.safe(cat)}">${A.safe(cat)}</button>`;
    }).join('');
  }

  function card(m,state){
    const st=A.machineStatus(m,state);
    const unavailable=st.maint===st.total;
    const text=st.free>0 ? `${st.free} disponível${st.free===1?'':'is'} agora`
      : unavailable ? 'Em manutenção' : 'Sem unidades livres hoje';
    return `<article class="machine-compact-card">
      <button class="machine-thumb-button" type="button" data-details="${A.safe(m.id)}" aria-label="Ver detalhes de ${A.safe(m.name)}">
        <img src="${A.assetFor(m)}" loading="lazy" alt="Ilustração de ${A.safe(m.name)}" />
        <span class="thumb-corner" aria-hidden="true">↗</span>
      </button>
      <div class="machine-compact-body">
        <h3 title="${A.safe(m.name)}">${A.safe(m.name)}</h3>
        <div class="machine-compact-availability ${st.key}"><span class="status-dot" aria-hidden="true"></span>${text}</div>
        <div class="machine-compact-actions">
          <button class="btn btn-details" type="button" data-details="${A.safe(m.id)}">Ver detalhes</button>
          <button class="btn btn-ask" type="button" data-request="${A.safe(m.id)}" ${unavailable?'disabled aria-label="Indisponível por manutenção"':''}>${unavailable?'Indisponível':'Solicitar'}</button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const state=A.load();A.applyBrand();
    $('#publicContact').textContent=state.company.phone||state.company.whatsapp||'Via solicitação no catálogo';
    renderTabs(state);
    const items=visibleMachines(state);
    const rail=$('#machineCarousel');
    rail.innerHTML=items.length ? items.map(m=>card(m,state)).join('') : `<div class="vitrine-empty">
      ${A.ico('search',30)}<strong>Nenhuma máquina encontrada</strong>
      <span>Experimente outra categoria ou limpe os filtros.</span>
      <button type="button" class="btn btn-outline" id="clearMachineFilters">Limpar filtros</button>
    </div>`;
    rail.scrollLeft=0;
    rail.querySelector('#clearMachineFilters')?.addEventListener('click',()=>{
      search='';filter='todas';selectedCategory='Todas';$('#machineSearch').value='';$('#availabilityFilter').value='todas';render();
    });
    updateArrows();
  }
  function updateArrows(){
    const rail=$('#machineCarousel');
    const enough=rail.scrollWidth>rail.clientWidth+8;
    const atStart=rail.scrollLeft<4;
    const atEnd=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-5;
    $('#machinePrev').disabled=!enough||atStart;
    $('#machineNext').disabled=!enough||atEnd;
  }
  function scrollMachines(direction) {
    const rail=$('#machineCarousel');
    const item=rail.querySelector('.machine-compact-card');
    if(!item)return;
    const step=item.getBoundingClientRect().width+16;
    rail.scrollBy({left:direction*step,behavior:'smooth'});
  }
  function openModal(id){
    const modal=$(id);lastFocused=document.activeElement;
    modal.hidden=false;document.body.classList.add('modal-open');
    const focusable=modal.querySelector('.modal-close');
    focusable?.focus();
  }
  function closeModal(id){
    const modal=$(id);if(!modal||modal.hidden)return;
    modal.hidden=true;
    if(!document.querySelector('.modal-backdrop:not([hidden])'))document.body.classList.remove('modal-open');
    if(lastFocused?.isConnected)lastFocused.focus();
  }
  function openDetails(id){
    const state=A.load();const m=state.machines.find(x=>x.id===id);if(!m)return;
    const st=A.machineStatus(m,state),unavailable=st.maint===st.total;
    const brand=m.brand&&m.brand!=='Marca não informada'?m.brand:'Não informada';
    const model=m.model&&m.model!=='Modelo não informado'?m.model:'Não informado';
    const purpose=m.purpose||m.description||m.type||'Finalidade ainda não cadastrada.';
    const generic=m.description && m.description!==purpose?m.description:null;
    const availabilityText=st.free>0?`${st.free} unidade${st.free===1?'':'s'} livre${st.free===1?'':'s'} hoje`:
      unavailable?'Todas as unidades estão em manutenção':'Todas as unidades estão em uso hoje';
    $('#detailsContent').innerHTML=`<div class="details-v4">
      <div class="details-v4-image">
        <div class="detail-category">${A.safe(m.category||A.categoryFromType(m.type))}</div>
        <img src="${A.assetFor(m)}" alt="Ilustração de ${A.safe(m.name)}" />
        <div class="detail-image-caption">EQUIPAMENTO • ALLOC LINK</div>
      </div>
      <div class="details-v4-content">
        <div class="detail-overline">INFORMAÇÕES DO EQUIPAMENTO</div>
        <h2 id="detailsModalTitle">${A.safe(m.name)}</h2>
        <p class="detail-intro">Confira os dados da máquina antes de solicitar.</p>
        <div class="detail-status ${st.key}"><span class="status-dot" aria-hidden="true"></span><div><strong>${A.safe(availabilityText)}</strong><small>Disponibilidade calculada para hoje; outra data pode ter uma situação diferente.</small></div></div>
        <section class="detail-purpose"><h3>Para que serve?</h3><p>${A.safe(purpose)}</p></section>
        <dl class="detail-facts">
          <div><dt>Marca</dt><dd>${A.safe(brand)}</dd></div>
          <div><dt>Modelo</dt><dd>${A.safe(model)}</dd></div>
          <div><dt>Categoria</dt><dd>${A.safe(m.category||A.categoryFromType(m.type))}</dd></div>
          <div><dt>Tipo de serviço</dt><dd>${A.safe(m.type||'Não informado')}</dd></div>
        </dl>
        ${generic?`<section class="detail-extra"><h3>Informações gerais</h3><p>${A.safe(generic)}</p></section>`:''}
        <p class="detail-count">${st.total} unidade(s) cadastrada(s) · ${st.used} em uso · ${st.maint} em manutenção</p>
        <div class="detail-actions"><button class="btn btn-outline" type="button" data-detail-close>Voltar</button><button class="btn btn-primary" type="button" data-detail-request="${A.safe(m.id)}" ${unavailable?'disabled':''}>${unavailable?'Indisponível para solicitação':'Solicitar esta máquina →'}</button></div>
      </div>
    </div>`;
    openModal('#detailsModal');
  }
  function openRequest(id){
    const state=A.load();const m=state.machines.find(x=>x.id===id);
    if(!m||A.capacity(m)===0){A.toast('Todas as unidades estão em manutenção.','error');return;}
    selectedMachine=id;
    $('#requestForm').reset();
    $('#requestStart').min=A.dayISO();$('#requestEnd').min=A.dayISO();
    $('#requestStart').value=A.dayISO(1);$('#requestEnd').value=A.dayISO(2);
    $('#requestQty').max=A.machineQty(m);$('#requestQty').value='1';
    $('#requestMachinePreview').innerHTML=`<img src="${A.assetFor(m)}" alt=""><div><span>MÁQUINA SELECIONADA</span><b>${A.safe(m.name)}</b><small>${A.safe(m.brand)} • ${A.safe(m.model)}</small></div>`;
    updateAvailability();openModal('#requestModal');
  }
  function updateAvailability(){
    const start=$('#requestStart').value,end=$('#requestEnd').value;
    const field=$('#requestAvailability');
    if(!selectedMachine||!start||!end||end<start){field.textContent='Escolha um período válido para consultar a disponibilidade.';field.classList.add('availability-error');return;}
    const free=A.availableBetween(selectedMachine,start,end),qty=Number($('#requestQty').value)||1;
    field.textContent=free?`${free} unidade(s) disponível(is) nas datas escolhidas.`:'Não há unidades disponíveis nesse período. Experimente outras datas.';
    field.classList.toggle('availability-error',free<qty);
  }
  function onRequest(event){
    event.preventDefault();
    const state=A.load(),f=new FormData(event.currentTarget);
    const name=String(f.get('name')||'').trim(),phone=String(f.get('phone')||'').trim();
    const location=String(f.get('location')||'').trim(),start=String(f.get('start')||''),end=String(f.get('end')||'');
    if(name.length<3){A.toast('Informe seu nome completo.','error');return;}
    const digits=A.phoneDigits(phone);if(digits.length<10||digits.length>13){A.toast('Informe um telefone válido com DDD.','error');return;}
    if(!A.validDates(start,end)){A.toast('Escolha um período válido.','error');return;}
    const qty=Number(f.get('quantity')||1),m=state.machines.find(x=>x.id===selectedMachine);
    if(!m||A.capacity(m)===0){A.toast('Equipamento indisponível.','error');return;}
    if(!Number.isInteger(qty)||qty<1||qty>A.machineQty(m)){A.toast('Quantidade inválida.','error');return;}
    const free=A.availableBetween(selectedMachine,start,end,state);
    if(free<qty){A.toast(`Existem somente ${free} unidade(s) livres nesse período.`,'error');updateAvailability();return;}
    const duplicated=state.requests.some(r=>r.machineId===selectedMachine&&A.phoneDigits(r.phone)===digits&&r.start===start&&r.end===end&&r.quantity===qty&&r.status==='pendente');
    if(duplicated){A.toast('Já existe uma solicitação pendente com esses dados.','error');return;}
    const req={id:A.shortId('S'),machineId:selectedMachine,name,phone,location,start,end,quantity:qty,status:'pendente',createdAt:new Date().toISOString()};
    state.requests.unshift(req);if(!A.write(state))return;
    closeModal('#requestModal');$('#successCode').textContent=req.id;
    const message=`Olá! Registrei uma solicitação pelo Alloc Link.\nProtocolo: ${req.id}\nMáquina: ${m.name}\nQuantidade: ${qty} unidade(s)\nPeríodo: ${A.brDate(start)} a ${A.brDate(end)}\nNome: ${name}\nAguardo a confirmação da empresa.`;
    const link=A.waLink(state.company.whatsapp,message);
    $('#whatsappLink').hidden=!link;$('#whatsappMissing').hidden=!!link;
    if(link)$('#whatsappLink').href=link;
    openModal('#successModal');
  }
  function init(){
    A.applyBrand();$('#searchIcon').innerHTML=A.ico('search',18);
    $('#machineSearch').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('pt-BR');render();});
    $('#availabilityFilter').addEventListener('change',e=>{filter=e.target.value;render();});
    $('#categoryTabs').addEventListener('click',e=>{const btn=e.target.closest('[data-category]');if(!btn)return;selectedCategory=btn.dataset.category;render();});
    $('#machineCarousel').addEventListener('click',e=>{const details=e.target.closest('[data-details]');const request=e.target.closest('[data-request]');if(details)openDetails(details.dataset.details);else if(request)openRequest(request.dataset.request);});
    $('#detailsContent').addEventListener('click',e=>{
      const close=e.target.closest('[data-detail-close]');const request=e.target.closest('[data-detail-request]');
      if(close)closeModal('#detailsModal');
      else if(request){const id=request.dataset.detailRequest;closeModal('#detailsModal');openRequest(id);}
    });
    $('#machinePrev').addEventListener('click',()=>scrollMachines(-1));
    $('#machineNext').addEventListener('click',()=>scrollMachines(1));
    $('#machineCarousel').addEventListener('scroll',updateArrows,{passive:true});
    window.addEventListener('resize',updateArrows);
    $('#requestForm').addEventListener('submit',onRequest);
    $('#requestStart').addEventListener('change',e=>{const end=$('#requestEnd');end.min=e.target.value;if(end.value<e.target.value)end.value=e.target.value;updateAvailability();});
    $('#requestEnd').addEventListener('change',updateAvailability);
    $('#requestQty').addEventListener('input',updateAvailability);
    document.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',()=>closeModal('#'+button.closest('.modal-backdrop').id)));
    document.querySelectorAll('.modal-backdrop').forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)closeModal('#'+modal.id); }));
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape')document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(modal=>closeModal('#'+modal.id));
    });
    // Menu lateral pela esquerda: animação real de entrada e saída sem alternar display:none.
    const menuButton=$('#clientMenuBtn'),sidebar=$('#clientSidebar'),backdrop=$('#clientSidebarBackdrop');
    const closeButton=$('#clientSidebarClose');
    let sidebarOpener=null,sidebarOpen=false,touchStart=null;
    const sidebarItems=()=>[...sidebar.querySelectorAll('button:not([disabled]),a[href]')];
    function openSidebar(){
      if(sidebarOpen)return;
      sidebarOpener=document.activeElement;
      sidebarOpen=true;
      sidebar.inert=false;
      sidebar.setAttribute('aria-hidden','false');
      menuButton.setAttribute('aria-expanded','true');
      menuButton.setAttribute('aria-label','Fechar menu de navegação');
      document.body.classList.add('public-menu-open');
      // Começa fechado pelo CSS e desliza da esquerda após a atualização do estado.
      sidebar.classList.add('is-open');
      backdrop.classList.add('is-open');
      closeButton.focus({preventScroll:true});
    }
    function closeSidebar({restoreFocus=true}={}){
      if(!sidebarOpen)return;
      sidebarOpen=false;
      sidebar.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      sidebar.setAttribute('aria-hidden','true');
      sidebar.inert=true;
      menuButton.setAttribute('aria-expanded','false');
      menuButton.setAttribute('aria-label','Abrir menu de navegação');
      document.body.classList.remove('public-menu-open');
      if(restoreFocus&&sidebarOpener?.isConnected)sidebarOpener.focus({preventScroll:true});
    }
    menuButton.addEventListener('click',()=>sidebarOpen?closeSidebar():openSidebar());
    closeButton.addEventListener('click',()=>closeSidebar());
    backdrop.addEventListener('click',()=>closeSidebar());
    sidebar.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeSidebar({restoreFocus:!link.getAttribute('href')?.startsWith('#')})));
    document.addEventListener('keydown',event=>{
      if(!sidebarOpen)return;
      if(event.key==='Escape'){event.preventDefault();closeSidebar();return;}
      if(event.key==='Tab'){
        const items=sidebarItems();if(!items.length)return;
        const first=items[0],last=items[items.length-1];
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===sidebar)){
          event.preventDefault();last.focus();
        }else if(!event.shiftKey&&document.activeElement===last){
          event.preventDefault();first.focus();
        }
      }
    });
    // Gesto opcional no celular: deslize o painel para a esquerda para fechar.
    sidebar.addEventListener('touchstart',event=>{
      if(event.touches.length!==1)return;
      touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
    },{passive:true});
    sidebar.addEventListener('touchend',event=>{
      if(!sidebarOpen||!touchStart||!event.changedTouches.length)return;
      const dx=event.changedTouches[0].clientX-touchStart.x;
      const dy=event.changedTouches[0].clientY-touchStart.y;
      if(dx < -75 && Math.abs(dx)>Math.abs(dy)*1.4)closeSidebar();
      touchStart=null;
    },{passive:true});
    $('#how1').innerHTML=A.ico('search',25);$('#how2').innerHTML=A.ico('eye',25);$('#how3').innerHTML=A.ico('inbox',25);$('#how4').innerHTML=A.ico('checkcircle',25);
    window.addEventListener('storage',e=>{if(e.key==='alloclink_mvp_2026_demo_v3')location.reload();});
    render();
  }
  document.addEventListener('DOMContentLoaded',init);
})();