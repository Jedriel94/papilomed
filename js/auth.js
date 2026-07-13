// Estado global de sesión, disponible para los demás scripts.
window.APP = { user: null };

// Escapa texto para insertarlo de forma segura en HTML.
window.esc = (v) =>
  (v == null ? '' : String(v))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Etiquetas legibles para los estatus.
window.LABELS = {
  pendiente: 'Pendiente',
  muestra_dejada: 'Muestra dejada',
  asignada: 'Asignada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

(async function initSession() {
  try {
    APP.user = await api.get('auth/me');
  } catch (_) {
    location.href = 'index.html'; // sin sesión → login
    return;
  }

  document.getElementById('userNombre').textContent = APP.user.nombre || APP.user.email;
  document.getElementById('userRol').textContent = APP.user.role;

  const esAdmin = APP.user.role === 'admin';

  // El formulario de nueva solicitud solo aplica al cliente.
  if (esAdmin) {
    const card = document.getElementById('formSolicitudCard');
    if (card) card.classList.add('hidden');
  } else {
    // El cliente no necesita ver la columna "Cliente".
    document.querySelectorAll('.col-cliente').forEach((el) => el.classList.add('hidden'));
  }

  // Arranca la carga de datos una vez conocemos el rol.
  document.dispatchEvent(new Event('sesion-lista'));
})();

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api.post('auth/logout');
  location.href = 'index.html';
});
