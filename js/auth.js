// Estado global de sesión, disponible para los demás scripts.
window.APP = { user: null };

// Escapa texto para insertarlo de forma segura en HTML.
window.esc = (v) =>
  (v == null ? '' : String(v))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Confirmación de eliminación con doble seguro: confirma y luego pide escribir "eliminar".
window.confirmarEliminacion = function (queEs) {
  if (!confirm(`¿Seguro que deseas eliminar ${queEs}?\n\nEsta acción NO se puede deshacer.`)) return false;
  const r = prompt('Para confirmar, escribe la palabra:  eliminar');
  if (r === null) return false;
  if (r.trim().toLowerCase() !== 'eliminar') {
    alert('No se eliminó. Debes escribir exactamente la palabra "eliminar".');
    return false;
  }
  return true;
};

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
    // El cliente no ve las secciones exclusivas de admin (p. ej. Usuarios).
    document.querySelectorAll('.solo-admin').forEach((el) => el.classList.add('hidden'));
    document.querySelectorAll('.col-cliente').forEach((el) => el.classList.add('hidden'));
  }

  // Arranca la carga de datos una vez conocemos el rol.
  document.dispatchEvent(new Event('sesion-lista'));
})();

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api.post('auth/logout');
  location.href = 'index.html';
});

// ---- Modal "Mi cuenta" (cambiar propio correo / contraseña) ----
(function () {
  const modal = document.getElementById('modalCuenta');
  const btnAbrir = document.getElementById('miCuentaBtn');
  const msg = document.getElementById('msgCuenta');
  if (!modal || !btnAbrir) return;

  function cerrar() { modal.classList.add('hidden'); }

  btnAbrir.addEventListener('click', () => {
    document.getElementById('c_email').value = APP.user ? APP.user.email : '';
    document.getElementById('c_password').value = '';
    document.getElementById('c_actual').value = '';
    msg.className = 'msg hidden';
    modal.classList.remove('hidden');
  });

  document.getElementById('c_cancelar').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

  document.getElementById('c_guardar').addEventListener('click', async () => {
    const payload = {
      email: document.getElementById('c_email').value.trim(),
      password: document.getElementById('c_password').value,
      password_actual: document.getElementById('c_actual').value,
    };
    if (!payload.password_actual) {
      msg.textContent = 'Escribe tu contraseña actual para confirmar.';
      msg.className = 'msg error';
      return;
    }
    try {
      const actualizado = await api.patch('auth/perfil', payload);
      APP.user.email = actualizado.email;
      document.getElementById('userNombre').textContent = APP.user.nombre || APP.user.email;
      msg.textContent = 'Datos actualizados correctamente.';
      msg.className = 'msg ok';
      setTimeout(cerrar, 1200);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'msg error';
    }
  });
})();
