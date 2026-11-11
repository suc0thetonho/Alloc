(function(){
'use strict';
const A=window.Alloc,$=sel=>document.querySelector(sel);
let current='dashboard',modalLogo=null;
const labels = {
    dashboard: "Painel geral",
    machines: "Máquinas",
    requests: "Solicitações",
    bookings: "Alocações",
    profile: "Meu perfil",
    company: "Minha empresa"
};

const boxIcon = {
    dashboard: "layers",
    machines: "truck",
    requests: "inbox",
    bookings: "calendar",
    profile: "user",
    company: "building",
    public: "external"
};

const machineCategories=['Escavação','Terraplenagem','Carga e movimentação','Nivelamento','Operação geral'];
const inp=(label,name,value='',opts={})=>`<label class="field ${opts.full?'field-full':''}">${A.safe(label)}${opts.optional?'<span class="optional"> (opcional)</span>':''}<input ${opts.type?'type="'+opts.type+'"':'type="text"'} name="${A.safe(name)}" value="${A.safe(value)}" ${opts.required?'required':''} ${opts.min?'min="'+A.safe(opts.min)+'"':''} ${opts.maxlength?'maxlength="'+opts.maxlength+'"':''} placeholder="${A.safe(opts.placeholder||'')}" /></label>`;
const pill=(label,key)=>`<span class="status-pill status-${A.safe(key)}"><i></i>${A.safe(label)}</span>`;
function canLogin(){return sessionStorage.getItem('alloc_demo_auth')==='1'}
function loginView(){const auth=canLogin();$('#loginLayer').hidden=auth;$('#adminShell').hidden=!auth;if(auth){A.applyBrand();showPage(current)}}
function showPage(view){current=view;$('#currentSection').textContent='Administração';$('#currentTitle').textContent=labels[view];document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#adminSidebar').classList.remove('open');render()}
function render(){const d=A.load();A.applyBrand();const pending=d.requests.filter(r=>r.status==='pendente').length;$('#pendingSidebar').hidden=pending===0;$('#pendingSidebar').textContent=pending;
  
const map = {
    dashboard: renderDashboard,
    machines: renderMachines,
    requests: renderRequests,
    bookings: renderBookings,

    // Nova tela Meu perfil
    profile: () => window.AllocProfile.render(),

    // Tela já existente
    company: renderCompany
};$('#adminContent').innerHTML=map[current](d);wireCurrent(d)}

function headline(eyebrow,title,desc,button=''){return `<div class="admin-head"><div><div class="eyebrow eyebrow-soft">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${button}</div>`}
function statusCount(d,key){return d.machines.reduce((sum,m)=>{const st=A.machineStatus(m,d);return sum+(key==='disponivel'?st.free:key==='alocada'?st.used:st.maint)},0)}
function totalUnits(d){return d.machines.reduce((sum,m)=>sum+A.machineQty(m),0)}
function renderDashboard(d){const pending=d.requests.filter(r=>r.status==='pendente'),recent=[...d.requests].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);const active=statusCount(d,'alocada');
  const stat=(icon,title,value,note,color)=>`<article class="stat-card"><span class="stat-icon ${color}">${A.ico(icon,22)}</span><div class="stat-label">${title}</div><div class="stat-number">${value}</div><div class="stat-note">${note}</div></article>`;
  return headline('VISÃO DA OPERAÇÃO','Bom dia, administrador.','Confira sua frota, os pedidos recebidos e as alocações em andamento.',`<button class="btn btn-primary" data-action="add-machine">${A.ico('plus',17)} Nova máquina</button>`)+
    `<div class="dashboard-company"><span class="dc-icon">${A.ico('building',24)}</span><div><span>AMBIENTE CONFIGURADO</span><strong>${A.safe(d.company.name)}</strong><small>Uma empresa por ambiente no MVP</small></div><button class="btn btn-small btn-outline" data-action="go-company">Personalizar ${A.ico('arrow',15)}</button></div>`+
    `<div class="stats-grid">${stat('truck','Total de unidades',totalUnits(d),'Em '+d.machines.length+' tipo(s) de equipamento','s-green')}${stat('checkcircle','Disponíveis agora',statusCount(d,'disponivel'),'Aptas para solicitação','s-lime')}${stat('clock','Em operação',active,'Unidades em uso hoje','s-yellow')}${stat('inbox','Pedidos pendentes',pending.length,'Aguardando sua análise','s-orange')}</div>`+
    `<div class="dashboard-columns"><section class="panel"><div class="panel-head"><div><h2>Solicitações recentes</h2><p>Pedidos feitos pelo catálogo público</p></div><button class="link-button" data-action="go-requests">Ver todas →</button></div>${recent.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Máquina</th><th>Período</th><th>Status</th></tr></thead><tbody>${recent.map(r=>{const m=d.machines.find(x=>x.id===r.machineId);return `<tr><td><b>${A.safe(r.name)}</b><small>#${A.safe(r.id)}</small></td><td>${A.safe(m?.name||'Equipamento removido')}</td><td>${A.brDate(r.start)}<br>${A.brDate(r.end)}</td><td>${requestPill(r.status)}</td></tr>`}).join('')}</tbody></table></div>`:empty('Nenhum pedido recebido','Quando clientes solicitarem máquinas, os pedidos aparecerão aqui.')}</section>`+
    `<section class="panel"><div class="panel-head"><div><h2>Visão da frota</h2><p>Estado dos equipamentos hoje</p></div></div><div class="fleet-summary"><div><span class="summary-dot green"></span> Disponíveis <strong>${statusCount(d,'disponivel')}</strong></div><div><span class="summary-dot orange"></span> Alocadas <strong>${statusCount(d,'alocada')}</strong></div><div><span class="summary-dot gray"></span> Manutenção <strong>${statusCount(d,'manutencao')}</strong></div></div><div class="bar-track"><div style="width:${pct(statusCount(d,'disponivel'),totalUnits(d))}%;background:#39a065"></div><div style="width:${pct(statusCount(d,'alocada'),totalUnits(d))}%;background:#f2b45a"></div><div style="width:${pct(statusCount(d,'manutencao'),totalUnits(d))}%;background:#9babb0"></div></div><div class="quick-actions"><button data-action="add-booking" class="quick-action">${A.ico('calendar',20)}<span><b>Nova alocação</b><small>Registrar um período</small></span>${A.ico('arrow',18)}</button><button data-action="go-machines" class="quick-action">${A.ico('truck',20)}<span><b>Gerenciar frota</b><small>Máquinas e parceiros</small></span>${A.ico('arrow',18)}</button></div></section></div>`}
function pct(n,all){return all?Math.round(n*100/all):0}
function requestPill(s){return `<span class="request-status request-${s}">${s==='pendente'?'Pendente':s==='aprovado'?'Aprovada':'Recusada'}</span>`}
function empty(title,desc){return `<div class="empty-state">${A.ico('inbox',28)}<h3>${title}</h3><p>${desc}</p></div>`}
function renderMachines(d){return headline('GERENCIAMENTO DA FROTA','Máquinas e equipamentos','Cadastre máquinas próprias ou de terceiros e mantenha a situação atualizada.',`<button class="btn btn-primary" data-action="add-machine">${A.ico('plus',17)} Adicionar máquina</button>`)+`<div class="mini-summary">${A.ico('info',17)} O cadastro agora destaca <strong>categoria</strong>, <strong>marca</strong>, <strong>modelo</strong> e <strong>para que a máquina serve</strong>, em linha com o catálogo do cliente.</div><div class="admin-machine-grid">${d.machines.map(m=>{const st=A.machineStatus(m,d);return `<article class="admin-machine-card"><div class="admin-machine-img"><img src="${A.assetFor(m)}" alt=""><span class="origin-chip">${m.origin==='terceiros'?'De parceiro':'Própria'}</span><span class="admin-category-badge">${A.safe(m.category||A.categoryFromType(m.type))}</span></div><div class="admin-machine-body"><div class="machine-title-row"><h3>${A.safe(m.name)}</h3></div><p>${A.safe(m.brand||'Marca não informada')} • ${A.safe(m.model||'Modelo não informado')}</p><div class="unit-count">${A.ico('layers',15)} <b>${st.total} unidade(s)</b> · ${st.free} livres · ${st.used} em uso · ${st.maint} manutenção</div><div class="status-row">${pill(st.text,st.key)}<small>${A.safe(st.hint)}</small></div><div class="admin-machine-purpose"><b>Para que serve:</b><span>${A.safe(m.purpose||m.description||m.type)}</span></div>${m.origin==='terceiros'?`<div class="partner-line">${A.ico('user',15)} ${A.safe(m.partner||'Proprietário não informado')}</div>`:''}<div class="admin-card-actions"><button class="btn btn-small btn-outline" data-action="edit-machine" data-id="${m.id}">${A.ico('edit',15)} Editar</button><button class="btn btn-small btn-subtle" data-action="toggle-maintenance" data-id="${m.id}">Ajustar manutenção</button></div></div></article>`}).join('')}</div>`}
function renderRequests(d){return headline('ATENDIMENTO','Solicitações de contratação','Os pedidos não bloqueiam a máquina antes da aprovação pelo administrador.')+`<div class="filter-row"><button class="filter-tab active" data-reqfilter="todos">Todos <span>${d.requests.length}</span></button><button class="filter-tab" data-reqfilter="pendente">Pendentes <span>${d.requests.filter(x=>x.status==='pendente').length}</span></button><button class="filter-tab" data-reqfilter="aprovado">Aprovados</button><button class="filter-tab" data-reqfilter="recusado">Recusados</button></div><div id="requestsList">${requestsHtml(d,'todos')}</div>`}
function requestsHtml(d,f){const rr=[...d.requests].filter(r=>f==='todos'||r.status===f).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return rr.length?`<div class="request-list">${rr.map(r=>{const m=d.machines.find(x=>x.id===r.machineId);return `<article class="request-item"><div class="request-icon">${A.ico('inbox',22)}</div><div class="request-main"><div class="request-item-head"><h3>${A.safe(r.name)}</h3>${requestPill(r.status)}</div><div class="request-id">Protocolo ${A.safe(r.id)} • ${A.brDate(r.createdAt.slice(0,10))}</div><div class="request-fields"><div><span>Equipamento / Qtde.</span><b>${A.safe(m?.name||'Máquina não encontrada')} · ${A.safe(r.quantity||1)} un.</b></div><div><span>Período</span><b>${A.brDate(r.start)} a ${A.brDate(r.end)}</b></div><div><span>Contato</span><b>${A.safe(r.phone)}</b></div><div><span>Local</span><b>${A.safe(r.location||'Não informado')}</b></div></div></div><div class="request-actions">${r.status==='pendente'?`<button class="btn btn-primary btn-small" data-action="approve-request" data-id="${r.id}">${A.ico('check',16)} Aprovar</button><button class="btn btn-outline btn-small" data-action="reject-request" data-id="${r.id}">Recusar</button>`:`<span class="readonly-note">Análise finalizada</span><button class="btn btn-primary btn-small" data-action="notify-request" data-id="${A.safe(r.id)}">${A.ico('phone',15)} Notificar cliente</button>`}</div></article>`}).join('')}</div>`:empty('Nenhuma solicitação nesta categoria','Assim que forem enviadas, você poderá analisá-las aqui.')}
function renderBookings(d){return headline('AGENDA OPERACIONAL','Controle de alocações','Registre os períodos de uso e evite conflitos entre serviços.',`<button class="btn btn-primary" data-action="add-booking">${A.ico('plus',17)} Nova alocação</button>`)+`<div class="mini-summary">${A.ico('shield',18)} A soma das unidades alocadas simultaneamente não pode ultrapassar a capacidade disponível em cada data.</div><div class="panel bookings-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Máquina / Qtde.</th><th>Cliente / Local</th><th>Período</th><th>Situação</th><th>Operações</th></tr></thead><tbody>${[...d.bookings].sort((a,b)=>b.start.localeCompare(a.start)).map(b=>{const m=d.machines.find(x=>x.id===b.machineId);const status=b.status==='encerrada'?'Encerrada':b.start>A.dayISO()?'Agendada':b.end<A.dayISO()?'Período finalizado':'Em andamento';return `<tr><td><b>${A.safe(m?.name||'Não encontrada')}</b><small>${A.safe(b.id)} · ${A.safe(b.quantity||1)} unidade(s)</small></td><td>${A.safe(b.customer)}<small>${A.safe(b.location||'Sem local')}</small></td><td>${A.brDate(b.start)}<small>até ${A.brDate(b.end)}</small></td><td><span class="request-status ${b.status==='encerrada'?'request-recusado':'request-aprovado'}">${status}</span></td><td><div class="table-actions">${b.status==='ativa'?`<button class="btn btn-small btn-outline" data-action="edit-booking" data-id="${b.id}">Editar</button><button class="btn btn-small btn-subtle" data-action="end-booking" data-id="${b.id}">Encerrar</button>`:'—'}</div></td></tr>`}).join('')}</tbody></table></div></div>`}
function renderCompany(d){const c=d.company;return headline('IDENTIDADE E CONTATO','Minha empresa','Configure a marca que seus clientes verão no catálogo público.')+`<div class="company-layout"><section class="panel company-form-panel"><h2>Informações da empresa</h2><p class="subheading">O MVP utiliza uma empresa configurável por ambiente. Não há cadastro simultâneo de várias locadoras.</p><form id="companyForm"><div class="company-logo-edit"><div class="company-logo-big"><img id="companyLogoPreview" src="${A.logoFor(c.logo)}" alt="Prévia da logo"></div><div><b>Logomarca</b><p>Formatos PNG, JPG ou WebP, até 5 MB. A imagem será redimensionada para a demonstração.</p><label class="btn btn-small btn-outline logo-upload">${A.ico('upload',16)} Trocar logo<input id="logoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button type="button" id="clearLogo" class="text-mini-button">Usar logo genérica</button></div></div><div class="form-grid">${inp('Nome da empresa','name',c.name,{required:true,full:true,maxlength:90})}${inp('Descrição curta','tagline',c.tagline,{full:true,maxlength:160})}<label class="field field-full">Descrição para o catálogo<textarea name="description" rows="3" maxlength="600">${A.safe(c.description)}</textarea></label>${inp('Cidade','city',c.city,{required:true})}${inp('Estado (UF)','state',c.state,{required:true,maxlength:2})}${inp('Endereço','address',c.address,{full:true,optional:true,maxlength:180})}${inp('Telefone','phone',c.phone,{optional:true})}${inp('WhatsApp comercial','whatsapp',c.whatsapp,{optional:true,placeholder:'DDD + número'})}${inp('E-mail','email',c.email,{type:'email',full:true,optional:true})}<label class="field field-full">Cor principal da marca <div class="color-control"><input type="color" name="brand" value="${A.safe(c.brand||'#278445')}"><span>Aplicada a botões e destaques do portal</span></div></label></div><div class="form-foot"><button class="btn btn-primary" type="submit">${A.ico('check',17)} Salvar alterações</button></div></form></section><aside class="company-side"><div class="panel company-preview-panel"><div class="eyebrow eyebrow-soft">PRÉVIA DO PERFIL</div><div class="company-preview-card"><img data-company-logo src="${A.logoFor(c.logo)}" alt="Logo da empresa"><h3>${A.safe(c.name)}</h3><p>${A.safe(c.tagline)}</p><span>${A.ico('pin',15)} ${A.safe([c.city,c.state].filter(Boolean).join(' / '))}</span></div><p>Nome, logo, descrição e cor de destaque aparecem no portal público.</p><a href="index.html" target="_blank" rel="noopener" class="btn btn-outline btn-block">Visualizar o catálogo ↗</a></div><div class="panel panel-warning"><b>${A.ico('info',17)} WhatsApp</b><p>Para habilitar o botão após uma solicitação, informe um número comercial válido com DDD. A mensagem só é enviada se o cliente confirmar no WhatsApp.</p></div><div class="panel demo-reset-panel"><h3>Reiniciar demonstração</h3><p>Restaura os dados fictícios de máquinas, pedidos e empresa para realizar uma nova apresentação.</p><button class="btn btn-outline btn-block btn-small" data-action="reset-demo" type="button">${A.ico('refresh',16)} Restaurar dados de exemplo</button></div></aside></div>`}
function wireCurrent(d){document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>handleAction(el.dataset.action,el.dataset.id)));
  if(current==='requests'){document.querySelectorAll('[data-reqfilter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-reqfilter]').forEach(x=>x.classList.toggle('active',x===b));$('#requestsList').innerHTML=requestsHtml(A.load(),b.dataset.reqfilter);$('#requestsList').querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>handleAction(el.dataset.action,el.dataset.id)))}))}
  if(current==='company')wireCompany();
  if (current === "profile") {
    window.AllocProfile.wire();
  }
}
function handleAction(action,id){const d=A.load();if(action==='add-machine')return machineDialog();if(action==='edit-machine')return machineDialog(id);if(action==='toggle-maintenance')return machineDialog(id);
  if(action==='add-booking')return bookingDialog();if(action==='edit-booking')return bookingDialog(id);if(action==='end-booking'){if(!confirm('Encerrar esta alocação e liberar o equipamento?'))return;const b=d.bookings.find(x=>x.id===id);if(!b)return;b.status='encerrada';b.endedAt=new Date().toISOString();A.write(d);render();A.toast('Alocação encerrada.');return}
  if(action==='approve-request')return approveDialog(id);if(action==='notify-request')return notifyDialog(id);if(action==='reject-request'){if(!confirm('Recusar esta solicitação?'))return;const r=d.requests.find(x=>x.id===id);if(!r||r.status!=='pendente')return;r.status='recusado';r.decidedAt=new Date().toISOString();A.write(d);render();A.toast('Solicitação recusada.');return}
  if(action==='reset-demo'){if(confirm('Restaurar a demonstração? Pedidos e edições locais serão substituídos pelos dados de exemplo.')){A.reset();showPage('dashboard');A.toast('Dados de demonstração restaurados.')}return}if(action==='go-company')return showPage('company');if(action==='go-requests')return showPage('requests');if(action==='go-machines')return showPage('machines');
}
function openModal(content){$('#adminModalBody').innerHTML=content;$('#adminModal').hidden=false;document.body.classList.add('modal-open');$('#adminModal').querySelector('input,button')?.focus()}
function closeModal(){$('#adminModal').hidden=true;document.body.classList.remove('modal-open')}
function machineDialog(id){
  const d=A.load(),orig=id?d.machines.find(x=>x.id===id):null;
  const m=orig||{name:'',category:'Escavação',type:'',brand:'',model:'',purpose:'',description:'',image:'retroescavadeira',origin:'propria',partner:'',partnerContact:'',quantity:1,maintenanceQty:0};
  openModal(`<div class="modal-header"><div class="eyebrow eyebrow-soft">GERENCIAMENTO DA FROTA</div><h2>${orig?'Editar equipamento':'Cadastrar equipamento'}</h2><p>Cadastre a máquina com marca, modelo, categoria e uma explicação clara do que ela faz no catálogo do cliente.</p></div>
  <form id="machineForm"><div class="form-grid">
    ${inp('Nome da máquina','name',m.name,{required:true,full:true,maxlength:70})}
    <label class="field">Categoria<select name="category">${machineCategories.map(cat=>`<option value="${cat}" ${((m.category||A.categoryFromType(m.type))===cat)?'selected':''}>${cat}</option>`).join('')}</select></label>
    ${inp('Tipo / aplicação principal','type',m.type,{required:true,maxlength:60,placeholder:'Ex.: escavação e apoio em obras'})}
    ${inp('Marca','brand',m.brand,{required:true,maxlength:60,placeholder:'Ex.: Caterpillar'})}
    ${inp('Modelo','model',m.model,{required:true,maxlength:60,placeholder:'Ex.: D6'})}
    <label class="field field-full">Para que serve<textarea name="purpose" rows="3" required maxlength="420">${A.safe(m.purpose||m.description||'')}</textarea></label>
    <label class="field field-full">Descrição complementar <textarea name="description" rows="3" maxlength="500">${A.safe(m.description||'')}</textarea></label>
    <label class="field">Quantidade total de unidades<input type="number" name="quantity" min="1" max="100" value="${A.machineQty(m)}" required></label>
    <label class="field">Unidades em manutenção<input type="number" name="maintenanceQty" min="0" max="100" value="${A.maintenanceQty(m)}" required></label>
    <label class="field">Ilustração<select name="image">${[['retroescavadeira','Retroescavadeira'],['trator-esteira','Trator de esteira'],['pa-carregadeira','Pá carregadeira'],['motoniveladora','Motoniveladora']].map(([v,l])=>`<option ${m.image===v?'selected':''} value="${v}">${l}</option>`).join('')}</select></label>
    <label class="field">Propriedade<select name="origin" id="originSelect"><option value="propria" ${m.origin==='propria'?'selected':''}>Máquina própria</option><option value="terceiros" ${m.origin==='terceiros'?'selected':''}>Máquina de terceiros</option></select></label>
    <div class="field-full partner-fields" id="partnerFields" ${m.origin==='terceiros'?'':'hidden'}>${inp('Proprietário parceiro','partner',m.partner,{full:true})}${inp('Contato do parceiro','partnerContact',m.partnerContact,{optional:true,full:true})}</div>
  </div><p class="form-support">Exemplo: 3 retroescavadeiras, sendo 1 em manutenção = 2 unidades operacionais. O catálogo exibirá marca, modelo, categoria e explicação da finalidade.</p>
  <div class="modal-actions"><button type="button" class="btn btn-outline" data-admin-close>Cancelar</button><button type="submit" class="btn btn-primary">${orig?'Salvar alterações':'Cadastrar equipamento'} →</button></div></form>`);
  $('#originSelect').addEventListener('change',e=>$('#partnerFields').hidden=e.target.value!=='terceiros');
  $('#machineForm').addEventListener('submit',e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),name=String(f.get('name')||'').trim(),category=String(f.get('category')||'').trim(),type=String(f.get('type')||'').trim(),brand=String(f.get('brand')||'').trim(),model=String(f.get('model')||'').trim(),purpose=String(f.get('purpose')||'').trim(),desc=String(f.get('description')||'').trim(),origin=f.get('origin');
    const quantity=Number(f.get('quantity')),maintenanceQty=Number(f.get('maintenanceQty'));
    if(!name||!type||!brand||!model||!purpose){A.toast('Preencha os campos obrigatórios.','error');return}
    if(!Number.isInteger(quantity)||quantity<1||quantity>100||!Number.isInteger(maintenanceQty)||maintenanceQty<0||maintenanceQty>quantity){A.toast('Quantidade total e manutenção precisam ser valores válidos.','error');return}
    const partner=String(f.get('partner')||'').trim();if(origin==='terceiros'&&!partner){A.toast('Informe o proprietário da máquina de terceiros.','error');return}
    if(orig){const peak=A.peakBooked(id,'0000-01-01','9999-12-31',d);if(peak>quantity-maintenanceQty){A.toast(`Há ${peak} unidade(s) simultaneamente reservadas. Não reduza a capacidade abaixo disso.`, 'error');return}}
    const next={id:id||A.shortId('M'),name,category:category||A.categoryFromType(type),type,brand,model,purpose,description:desc||purpose,image:String(f.get('image')||''),origin,partner:origin==='terceiros'?partner:'',partnerContact:origin==='terceiros'?String(f.get('partnerContact')||'').trim():'',quantity,maintenanceQty,maintenance:maintenanceQty===quantity};
    if(orig)Object.assign(orig,next);else d.machines.unshift(next);
    if(A.write(d)){closeModal();render();A.toast(orig?'Equipamento atualizado.':'Equipamento cadastrado.')}
  });
}
function bookingDialog(id){
  const d=A.load(),orig=id?d.bookings.find(x=>x.id===id):null,b=orig||{machineId:d.machines.find(m=>A.capacity(m)>0)?.id||'',customer:'',contact:'',location:'',quantity:1,start:A.dayISO(),end:A.dayISO(1)};
  openModal(`<div class="modal-header"><div class="eyebrow eyebrow-soft">AGENDA OPERACIONAL</div><h2>${orig?'Editar alocação':'Registrar alocação'}</h2><p>Informe a quantidade. O sistema não permitirá ultrapassar a capacidade nas datas.</p></div><form id="bookingForm"><div class="form-grid">
    <label class="field field-full">Máquina<select name="machineId" required>${d.machines.map(m=>`<option value="${A.safe(m.id)}" ${m.id===b.machineId?'selected':''}>${A.safe(m.name)} (${A.machineQty(m)} un.)</option>`).join('')}</select></label>
    ${inp('Cliente responsável','customer',b.customer,{full:true,required:true,maxlength:90})}${inp('Contato','contact',b.contact,{optional:true,full:true,maxlength:22})}
    ${inp('Local de utilização','location',b.location,{required:true,full:true,maxlength:130})}
    <label class="field">Quantidade de unidades<input type="number" name="quantity" min="1" max="100" required value="${A.safe(b.quantity||1)}"></label>
    ${inp('Início','start',b.start,{required:true,type:'date',min:orig?'':A.dayISO()})}${inp('Término','end',b.end,{required:true,type:'date',min:orig?'':A.dayISO()})}
    <div id="bookingAvailability" class="field-full availability-note" aria-live="polite"></div>
    </div><div class="modal-actions"><button type="button" class="btn btn-outline" data-admin-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar alocação →</button></div></form>`);
  function hint(){const f=new FormData($('#bookingForm')),free=A.availableBetween(String(f.get('machineId')),String(f.get('start')),String(f.get('end')),A.load(),id||null),q=Number(f.get('quantity'));$('#bookingAvailability').textContent=`${free} unidade(s) disponíveis durante todo o período.`;$('#bookingAvailability').classList.toggle('availability-error',free<q)}
  $('#bookingForm').addEventListener('input',hint);hint();
  $('#bookingForm').addEventListener('submit',e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),machineId=String(f.get('machineId')),start=String(f.get('start')),end=String(f.get('end')),customer=String(f.get('customer')||'').trim(),location=String(f.get('location')||'').trim(),quantity=Number(f.get('quantity'));
    if(!customer||!location){A.toast('Informe o cliente e o local.','error');return}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||end<start||(!orig&&start<A.dayISO())){A.toast('Período inválido.','error');return}
    const machine=d.machines.find(x=>x.id===machineId);
    if(!machine||!Number.isInteger(quantity)||quantity<1||quantity>A.machineQty(machine)){A.toast('Máquina ou quantidade inválida.','error');return}
    const free=A.availableBetween(machineId,start,end,d,id||null);
    if(free<quantity){A.toast(`Quantidade indisponível: restam ${free} unidade(s) nesse período.`, 'error');return}
    const next={id:orig?.id||A.shortId('A'),machineId,customer,contact:String(f.get('contact')||'').trim(),location,quantity,start,end,status:'ativa',requestId:orig?.requestId||null,createdAt:orig?.createdAt||new Date().toISOString()};
    if(orig)Object.assign(orig,next);else d.bookings.unshift(next);
    if(A.write(d)){closeModal();render();A.toast(orig?'Alocação atualizada.':'Alocação registrada.')}
  });
}
function notifyMessage(r,m,company){
  return r.status==='aprovado'?
    `Olá, ${r.name}! ✅\nSua solicitação foi APROVADA pela ${company.name}.\n\nProtocolo: ${r.id}\nEquipamento: ${m?.name||'Máquina'}\nQuantidade: ${r.quantity||1} unidade(s)\nPeríodo: ${A.brDate(r.start)} a ${A.brDate(r.end)}\n\nA contratação foi confirmada. Em caso de dúvidas, fale conosco.`:
    `Olá, ${r.name}!\nSua solicitação ${r.id} para ${m?.name||'o equipamento'} (de ${A.brDate(r.start)} a ${A.brDate(r.end)}) não pôde ser aprovada pela ${company.name}. Entre em contato para consultar outras datas.`;
}
function notifyDialog(id){
  const d=A.load(),r=d.requests.find(x=>x.id===id),m=d.machines.find(x=>x.id===r?.machineId);
  if(!r||r.status==='pendente'){A.toast('Conclua a análise antes de notificar o cliente.','error');return}
  const link=A.waLink(r.phone,notifyMessage(r,m,d.company)),valid=[12,13].includes(A.phoneDigits(r.phone).length)||[10,11].includes(A.phoneDigits(r.phone).length);
  openModal(`<div class="modal-header"><div class="eyebrow eyebrow-soft">COMUNICAÇÃO COM O CLIENTE</div><h2>Notificar cliente</h2><p>A notificação é preparada automaticamente, mas o envio é <strong>manual pelo WhatsApp</strong>.</p></div><div class="approval-summary"><div><span>Cliente</span><b>${A.safe(r.name)}</b></div><div><span>Equipamento</span><b>${A.safe(m?.name||'Equipamento')}</b></div><div><span>Quantidade</span><b>${A.safe(r.quantity||1)} unidade(s)</b></div><div><span>Situação</span><b>${r.status==='aprovado'?'Aprovada':'Recusada'}</b></div><div><span>Telefone</span><b>${A.safe(r.phone)}</b></div></div>
  <p class="form-support">Clique para abrir a conversa e depois pressione <strong>Enviar</strong> no WhatsApp. O protótipo não sabe se a mensagem foi entregue.</p>
  <div class="modal-actions"><button type="button" class="btn btn-outline" data-admin-close>Voltar</button>${link&&valid?`<a class="btn btn-primary" href="${A.safe(link)}" target="_blank" rel="noopener noreferrer">${A.ico('phone',17)} Abrir WhatsApp e notificar ↗</a>`:'<span class="availability-note availability-error">Número do cliente inválido. Corrija o cadastro para notificar.</span>'}</div>`);
}
function approveDialog(id){
  const d=A.load(),r=d.requests.find(x=>x.id===id);if(!r||r.status!=='pendente')return;
  const m=d.machines.find(x=>x.id===r.machineId);if(!m){A.toast('Máquina não encontrada.','error');return}
  const available=A.availableBetween(r.machineId,r.start,r.end,d);
  openModal(`<div class="modal-header"><div class="eyebrow eyebrow-soft">CONFIRMAR SOLICITAÇÃO</div><h2>Aprovar pedido ${A.safe(r.id)}</h2><p>Aprovar cria uma alocação e compromete ${A.safe(r.quantity||1)} unidade(s) nas datas solicitadas.</p></div>
  <div class="approval-summary"><div><span>Cliente</span><b>${A.safe(r.name)}</b></div><div><span>Máquina</span><b>${A.safe(m.name)}</b></div><div><span>Quantidade solicitada</span><b>${A.safe(r.quantity||1)} unidade(s)</b></div><div><span>Livres no período</span><b>${available} unidade(s)</b></div><div><span>Período</span><b>${A.brDate(r.start)} a ${A.brDate(r.end)}</b></div><div><span>Contato</span><b>${A.safe(r.phone)}</b></div></div>
  <form id="approveForm"><div class="form-grid">${inp('Local de utilização','location',r.location,{full:true,required:true,placeholder:'Obra / endereço'})}</div><div class="modal-actions"><button type="button" class="btn btn-outline" data-admin-close>Cancelar</button><button type="submit" class="btn btn-primary">Confirmar aprovação →</button></div></form>`);
  $('#approveForm').addEventListener('submit',e=>{
    e.preventDefault();const loc=String(new FormData(e.currentTarget).get('location')||'').trim();if(!loc){A.toast('Informe o local de utilização.','error');return}
    const fresh=A.load(),req=fresh.requests.find(x=>x.id===id),machine=fresh.machines.find(x=>x.id===req?.machineId);
    if(!req||req.status!=='pendente'||!machine){A.toast('Pedido já foi processado.','error');return}
    if(req.end<A.dayISO()){A.toast('O período solicitado já passou. Solicite novas datas.','error');return}
    const free=A.availableBetween(req.machineId,req.start,req.end,fresh),q=Number(req.quantity)||1;
    if(free<q){A.toast(`Não é possível aprovar: apenas ${free} unidade(s) livres nas datas.`, 'error');return}
    const b={id:A.shortId('A'),machineId:req.machineId,customer:req.name,contact:req.phone,location:loc,quantity:q,start:req.start,end:req.end,status:'ativa',requestId:req.id,createdAt:new Date().toISOString()};
    fresh.bookings.unshift(b);req.status='aprovado';req.decidedAt=new Date().toISOString();
    if(A.write(fresh)){render();A.toast('Pedido aprovado! Agora notifique o cliente.');notifyDialog(id)}
  });
}
function wireCompany(){const c=A.load().company;modalLogo=c.logo;$('#logoInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(f.type)){A.toast('Use uma imagem PNG, JPG ou WebP de até 5 MB.','error');e.target.value='';return}
    try{const newLogo=await compressLogo(f);modalLogo=newLogo;$('#companyLogoPreview').src=newLogo;A.toast('Prévia da logomarca atualizada. Clique em Salvar alterações.')}catch(err){A.toast('Não foi possível processar a imagem.','error')}});
    $('#clearLogo').addEventListener('click',()=>{modalLogo='assets/logo-generica.svg';$('#companyLogoPreview').src=modalLogo});
    $('#companyForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget),d=A.load(),name=String(f.get('name')||'').trim(),city=String(f.get('city')||'').trim(),state=String(f.get('state')||'').trim().toUpperCase();if(!name||!city||state.length!==2){A.toast('Preencha nome, cidade e UF (2 letras).','error');return}const wa=String(f.get('whatsapp')||'').trim();if(wa&&![10,11,12,13].includes(A.phoneDigits(wa).length)){A.toast('WhatsApp inválido. Informe DDD e número.','error');return}
    d.company={...d.company,name,tagline:String(f.get('tagline')||'').trim(),description:String(f.get('description')||'').trim(),city,state,address:String(f.get('address')||'').trim(),phone:String(f.get('phone')||'').trim(),whatsapp:wa,email:String(f.get('email')||'').trim(),brand:String(f.get('brand')||'#278445'),logo:modalLogo};if(A.write(d)){render();A.toast('Perfil da empresa salvo. Confira no portal público.')}})
}
function compressLogo(f){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,420/img.width,300/img.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/png'))};img.onerror=reject;img.src=reader.result};reader.readAsDataURL(f)})}
function init(){document.querySelectorAll('[data-sicon]').forEach(el=>el.innerHTML=A.ico(boxIcon[el.dataset.sicon]||'info',19));
  $('#loginForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(f.get('email')==='admin@alloclink.demo'&&f.get('password')==='demo123'){sessionStorage.setItem('alloc_demo_auth','1');loginView();A.toast('Bem-vindo à demonstração do Alloc Link.')}else A.toast('Credenciais de demonstração incorretas.','error')});
  $('#logoutBtn').addEventListener('click',()=>{sessionStorage.removeItem('alloc_demo_auth');window.AllocProfile.atualizarMenu();loginView()});document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>showPage(el.dataset.view)));$('#toggleSidebar').addEventListener('click',()=>$('#adminSidebar').classList.toggle('open'));$('#adminModal').addEventListener('click',e=>{if(e.target===$('#adminModal')||e.target.closest('[data-admin-close]'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#adminModal').hidden)closeModal();$('#adminSidebar').classList.remove('open')}});
  window.addEventListener('storage',e=>{if(e.key==='alloclink_app_demo_v1'){location.reload()}});loginView();
}
document.addEventListener('DOMContentLoaded',init);
})();
