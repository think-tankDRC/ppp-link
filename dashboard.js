'use strict';

const dashboardClient = window.supabaseClient;
const statsSection = document.querySelector('.stats-grid');
const registrationsPanel = document.querySelector('.panel');
const dashboardTable = document.getElementById('tableBody');
const dashboardSearch = document.getElementById('searchInput');
const dashboardStatus = document.getElementById('statusFilter');
const selectAllRows = document.getElementById('selectAll');
const dashboardEmpty = document.getElementById('emptyState');
const selectedIds = new Set();
let inscriptions = [];

const statusLabels = { pending: 'En attente', valid: 'Validée', refused: 'Refusée' };

function showDashboardNotice(text, isError = false) {
  let notice = document.getElementById('dashboardNotice');
  if (!notice) {
    notice = document.createElement('p');
    notice.id = 'dashboardNotice';
    notice.setAttribute('role', isError ? 'alert' : 'status');
    notice.style.cssText = 'margin:14px 0;padding:12px 16px;border-radius:10px;background:#20204f;color:#f5f7ff';
    document.querySelector('.page-shell').prepend(notice);
  }
  notice.textContent = text;
  notice.style.color = isError ? '#ffb7b7' : '#f5f7ff';
}

function formatRegistrationDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

function getVisibleInscriptions() {
  const query = dashboardSearch.value.trim().toLocaleLowerCase('fr');
  const status = dashboardStatus.value;
  return inscriptions.filter(person => {
    const matchesQuery = !query || [person.name, person.email, person.phone, person.company, person.training_session]
      .some(value => String(value || '').toLocaleLowerCase('fr').includes(query));
    return matchesQuery && (status === 'all' || person.status === status);
  });
}

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text || '';
  return cell;
}

function renderDashboard() {
  document.getElementById('totalCount').textContent = inscriptions.length;
  document.getElementById('validCount').textContent = inscriptions.filter(person => person.status === 'valid').length;
  document.getElementById('pendingCount').textContent = inscriptions.filter(person => person.status === 'pending').length;
  document.getElementById('refusedCount').textContent = inscriptions.filter(person => person.status === 'refused').length;

  const visible = getVisibleInscriptions();
  dashboardTable.replaceChildren();
  dashboardEmpty.classList.toggle('show', visible.length === 0);
  visible.forEach(person => {
    const row = document.createElement('tr');
    const selectCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'row-check';
    checkbox.dataset.id = person.id;
    checkbox.setAttribute('aria-label', `Sélectionner ${person.name}`);
    checkbox.checked = selectedIds.has(person.id);
    selectCell.appendChild(checkbox);
    row.appendChild(selectCell);

    const personCell = document.createElement('td');
    const personWrap = document.createElement('div');
    personWrap.className = 'person';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = person.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
    const identity = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'name';
    name.textContent = person.name;
    const id = document.createElement('div');
    id.className = 'meta';
    id.textContent = person.reference;
    identity.append(name, id);
    personWrap.append(avatar, identity);
    personCell.appendChild(personWrap);
    row.appendChild(personCell);

    row.appendChild(createCell(person.training_session));
    const contactCell = document.createElement('td');
    const email = document.createElement('div');
    email.textContent = person.email;
    const phone = document.createElement('div');
    phone.className = 'meta';
    phone.textContent = `${person.phone} · ${person.company}`;
    contactCell.append(email, phone);
    row.appendChild(contactCell);
    row.appendChild(createCell(formatRegistrationDate(person.created_at)));

    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${person.status === 'valid' ? 'valid' : person.status === 'refused' ? 'refused' : 'pending'}`;
    badge.textContent = statusLabels[person.status] || person.status;
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'actions';
    const view = document.createElement('button');
    view.className = 'table-btn';
    view.type = 'button';
    view.dataset.action = 'view';
    view.dataset.id = person.id;
    view.textContent = 'Voir';
    const remove = document.createElement('button');
    remove.className = 'table-btn delete';
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.dataset.id = person.id;
    remove.textContent = 'Supprimer';
    actions.append(view, remove);
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);
    dashboardTable.appendChild(row);
  });

  const visibleIds = visible.map(person => person.id);
  const selectedVisible = visibleIds.filter(id => selectedIds.has(id)).length;
  selectAllRows.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
  selectAllRows.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
}

async function loadInscriptions() {
  showDashboardNotice('Chargement des inscriptions…');
  inscriptions = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await dashboardClient
      .from('inscriptions')
      .select('id,reference,name,email,phone,company,role,training_session,message,status,created_at')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('Supabase inscriptions query failed:', error);
      showDashboardNotice('Impossible de charger les inscriptions. Vérifiez le schéma et les règles RLS Supabase.', true);
      return;
    }
    inscriptions.push(...data);
    if (data.length < pageSize) break;
  }
  document.getElementById('dashboardNotice')?.remove();
  statsSection.hidden = false;
  statsSection.style.display = '';
  registrationsPanel.hidden = false;
  registrationsPanel.style.display = '';
  renderDashboard();
}

function exportInscriptions() {
  const rows = getVisibleInscriptions();
  const fields = [
    ['Référence', person => person.reference],
    ['Nom', person => person.name],
    ['E-mail', person => person.email],
    ['Téléphone', person => person.phone],
    ['Entreprise', person => person.company],
    ['Fonction', person => person.role],
    ['Session', person => person.training_session],
    ['Date', person => formatRegistrationDate(person.created_at)],
    ['Statut', person => statusLabels[person.status] || person.status],
    ['Message', person => person.message]
  ];
  const escapeCell = value => `"${String(value || '').replace(/"/g, '""')}"`;
  const csv = [fields.map(([label]) => label), ...rows.map(person => fields.map(([, value]) => value(person)))]
    .map(row => row.map(escapeCell).join(';'))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'inscriptions.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function deleteInscription(id) {
  const person = inscriptions.find(item => item.id === id);
  if (!person || !window.confirm(`Supprimer l’inscription de ${person.name} ? Cette action est définitive.`)) return;
  const { error } = await dashboardClient.from('inscriptions').delete().eq('id', id);
  if (error) {
    console.error('Supabase inscription delete failed:', error);
    showDashboardNotice('La suppression a échoué. Vérifiez les règles RLS Supabase.', true);
    return;
  }
  selectedIds.delete(id);
  await loadInscriptions();
}

async function deleteSelectedInscriptions() {
  const ids = [...selectedIds];
  if (!ids.length) {
    showDashboardNotice('Sélectionnez au moins une inscription à supprimer.', true);
    return;
  }
  if (!window.confirm(`Supprimer définitivement ${ids.length} inscription(s) ?`)) return;
  const { error } = await dashboardClient.from('inscriptions').delete().in('id', ids);
  if (error) {
    console.error('Supabase bulk inscription delete failed:', error);
    showDashboardNotice('La suppression a échoué. Vérifiez les règles RLS Supabase.', true);
    return;
  }
  ids.forEach(id => selectedIds.delete(id));
  await loadInscriptions();
}

function handleDashboardClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (target.closest('#exportBtn')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    exportInscriptions();
  } else if (target.closest('#deleteSelectedBtn')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    deleteSelectedInscriptions();
  } else {
    const actionButton = target.closest('[data-action]');
    if (!actionButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const person = inscriptions.find(item => item.id === actionButton.dataset.id);
    if (actionButton.dataset.action === 'delete') {
      deleteInscription(actionButton.dataset.id);
    } else if (person) {
      window.alert([
        person.name,
        person.email,
        person.phone,
        person.company,
        person.role || 'Fonction non renseignée',
        person.training_session,
        `Référence : ${person.reference}`,
        `Statut : ${statusLabels[person.status] || person.status}`,
        person.message || 'Aucun message'
      ].join('\n'));
    }
  }
}

function addPublicAccessWarning() {
  const warning = document.createElement('p');
  warning.setAttribute('role', 'note');
  warning.style.cssText = 'margin:14px 0;padding:12px 16px;border:1px solid rgba(255,207,112,.35);border-radius:10px;background:rgba(255,207,112,.08);color:#ffdf9c;font-size:12px';
  warning.textContent = 'Dashboard sans connexion : toute personne ayant ce lien peut consulter et supprimer les inscriptions.';
  document.querySelector('.topbar').insertAdjacentElement('afterend', warning);
}

dashboardTable.replaceChildren();
statsSection.hidden = true;
statsSection.style.display = 'none';
registrationsPanel.hidden = true;
registrationsPanel.style.display = 'none';
addPublicAccessWarning();

if (!dashboardClient) {
  showDashboardNotice('Dashboard non configuré : renseignez l’URL et la clé publique du projet Supabase.', true);
} else {
  document.addEventListener('click', handleDashboardClick, true);
  document.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('.topbar-actions .button.primary')) {
      window.location.href = 'index.html';
    }
  });
  document.addEventListener('input', event => {
    if (event.target === dashboardSearch) renderDashboard();
  });
  document.addEventListener('change', event => {
    if (event.target === dashboardStatus) renderDashboard();
    if (event.target === selectAllRows) {
      getVisibleInscriptions().forEach(person => {
        if (selectAllRows.checked) selectedIds.add(person.id);
        else selectedIds.delete(person.id);
      });
      renderDashboard();
    }
    if (event.target instanceof HTMLInputElement && event.target.classList.contains('row-check')) {
      const id = event.target.dataset.id;
      if (event.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      renderDashboard();
    }
  }, true);
  loadInscriptions();
}
