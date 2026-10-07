'use strict';

const registrationForm = document.getElementById('registrationForm');
const submitButton = registrationForm.querySelector('[type="submit"]');
let registrationEntry = null;

registrationForm.querySelector('.note').textContent = window.supabaseClient
  ? 'Après enregistrement, votre fiche de paiement sera disponible au téléchargement.'
  : 'Connexion Supabase à configurer avant de recevoir les inscriptions.';

function showRegistrationError(message) {
  let error = document.getElementById('registration-error');
  if (!error) {
    error = document.createElement('p');
    error.id = 'registration-error';
    error.setAttribute('role', 'alert');
    error.style.cssText = 'color:#ffb7b7;text-align:center;font-size:12px;margin:12px 0 0';
    submitButton.insertAdjacentElement('afterend', error);
  }
  error.textContent = message;
}

function makeReference() {
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const token = crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8).toUpperCase()
    : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `PPP-${day}-${token}`;
}

function addPaymentDetails() {
  const payment = document.createElement('section');
  payment.className = 'summary payment-details';
  payment.innerHTML = '<strong>Informations de paiement</strong><p>Banque : Equity BCDC</p><p>Numéro de compte : <b>00011050233200325136483</b></p><p>Veuillez indiquer votre référence d’inscription dans le motif du paiement.</p>';
  document.getElementById('summary').insertAdjacentElement('afterend', payment);
}

function setUpReceiptDownloads() {
  document.querySelector('#success h2').textContent = 'Inscription envoyée';
  document.querySelector('#success .lead').textContent =
    'Votre inscription a été enregistrée. Téléchargez votre fiche et utilisez les coordonnées bancaires ci-dessous pour effectuer le paiement.';
  document.getElementById('send').hidden = true;
  document.getElementById('edit').hidden = true;
  document.getElementById('print').textContent = 'Télécharger en PDF';
  document.getElementById('download').textContent = 'Télécharger en PNG';
  document.querySelector('#success .note').textContent =
    'Le téléchargement PDF ouvre la fenêtre d’impression : choisissez « Enregistrer au format PDF ».';
  addPaymentDetails();
}

function drawReceiptPng(entry) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext('2d');
  if (!context) {
    showRegistrationError('Le téléchargement PNG est indisponible dans ce navigateur.');
    return;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#1b1b47';
  context.fillRect(0, 0, canvas.width, 250);
  context.fillStyle = '#ffffff';
  context.font = 'bold 42px system-ui, sans-serif';
  context.fillText('ACADEMY RDC STRATÉGIE', 92, 105);
  context.font = '24px system-ui, sans-serif';
  context.fillText('PPP CAPACITY BUILDING · FORMATION EXÉCUTIVE', 92, 157);

  let y = 340;
  context.fillStyle = '#1b1b47';
  context.font = 'bold 38px system-ui, sans-serif';
  context.fillText('FICHE D’INSCRIPTION', 92, y);
  y += 56;
  context.fillStyle = '#58617a';
  context.font = '24px system-ui, sans-serif';
  context.fillText(`Référence : ${entry.reference}`, 92, y);
  y += 42;
  context.fillText(`Date : ${entry.date}`, 92, y);

  const fields = [
    ['Nom complet', entry.name],
    ['Adresse e-mail', entry.email],
    ['Téléphone', entry.phone],
    ['Entreprise / institution', entry.company],
    ['Fonction', entry.role || 'Non renseigné'],
    ['Session de formation', entry.training_session],
    ['Message', entry.message || 'Aucun']
  ];
  y += 94;
  fields.forEach(([label, value]) => {
    context.fillStyle = '#58617a';
    context.font = 'bold 18px system-ui, sans-serif';
    context.fillText(label.toUpperCase(), 92, y);
    y += 34;
    context.fillStyle = '#1d2440';
    context.font = '25px system-ui, sans-serif';
    const words = String(value).split(/\s+/);
    let line = '';
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > 1040 && line) {
        context.fillText(line, 92, y);
        y += 34;
        line = word;
      } else {
        line = next;
      }
    });
    if (line) context.fillText(line, 92, y);
    y += 58;
  });

  y = Math.max(y + 15, 1190);
  context.fillStyle = '#f1f2fa';
  context.fillRect(72, y, 1096, 330);
  context.strokeStyle = '#c6c9dc';
  context.lineWidth = 2;
  context.strokeRect(72, y, 1096, 330);
  context.fillStyle = '#1b1b47';
  context.font = 'bold 26px system-ui, sans-serif';
  context.fillText('INFORMATIONS DE PAIEMENT', 105, y + 58);
  context.font = '24px system-ui, sans-serif';
  context.fillText('Banque : Equity BCDC', 105, y + 119);
  context.font = 'bold 27px system-ui, sans-serif';
  context.fillText('Compte : 00011050233200325136483', 105, y + 180);
  context.font = '21px system-ui, sans-serif';
  context.fillText('Motif du paiement : indiquer votre référence d’inscription.', 105, y + 239);
  context.fillStyle = '#58617a';
  context.font = '19px system-ui, sans-serif';
  context.fillText('Contact : +243 831 176 196 · strategierdc@gmail.com', 92, 1665);

  canvas.toBlob(blob => {
    if (!blob) {
      showRegistrationError('La création du fichier PNG a échoué.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entry.reference}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

document.getElementById('download').addEventListener('click', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (registrationEntry) drawReceiptPng(registrationEntry);
});

registrationForm.addEventListener('submit', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();

  for (const field of registrationForm.querySelectorAll('input:not([type=radio]):not([type=checkbox]),textarea')) {
    field.value = field.value.trim();
  }
  if (!registrationForm.reportValidity()) return;

  if (!window.supabaseClient) {
    showRegistrationError('Le formulaire n’est pas encore connecté à Supabase. Configurez l’URL et la clé publique du projet.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Enregistrement…';
  const values = Object.fromEntries(new FormData(registrationForm));
  const reference = makeReference();
  const createdAt = new Date();

  try {
    const { error } = await window.supabaseClient.from('inscriptions').insert({
      reference,
      name: values.name,
      email: values.email,
      phone: values.phone,
      company: values.company,
      role: values.role || null,
      training_session: values.session,
      message: values.message || null
    });
    if (error) throw error;

    registrationEntry = {
      ...values,
      reference,
      training_session: values.session,
      date: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(createdAt)
    };
    window.entry = registrationEntry;

    const summary = document.getElementById('summary');
    summary.replaceChildren();
    const labels = {
      name: 'Nom complet',
      email: 'Adresse e-mail',
      phone: 'Téléphone',
      company: 'Entreprise / institution',
      role: 'Fonction',
      session: 'Session de formation',
      message: 'Message'
    };
    Object.entries(labels).forEach(([key, label]) => {
      const paragraph = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = label;
      paragraph.append(strong, document.createTextNode(values[key] || 'Non renseigné'));
      summary.appendChild(paragraph);
    });
    document.getElementById('reference').textContent = `Référence : ${reference}`;
    setUpReceiptDownloads();
    document.getElementById('form-view').hidden = true;
    document.getElementById('success').hidden = false;
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error('Supabase inscription insert failed:', error);
    showRegistrationError('Impossible d’enregistrer votre inscription. Vérifiez votre connexion et réessayez.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "S'inscrire";
  }
}, true);
