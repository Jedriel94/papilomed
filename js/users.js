(function () {
  const tbody = document.getElementById('tbodyUsuarios');
  const empty = document.getElementById('emptyUsuarios');
  const form = document.getElementById('formUsuario');
  const msg = document.getElementById('msgUsuario');

  function showMsg(text, tipo) {
    msg.textContent = text;
    msg.className = 'msg ' + tipo;
  }

  async function cargar() {
    const items = await api.get('users');
    render(items);
  }

  function render(items) {
    tbody.innerHTML = '';
    empty.classList.toggle('hidden', items.length > 0);

    for (const u of items) {
      const fecha = u.created_at ? new Date(u.created_at.replace(' ', 'T')).toLocaleDateString('es-MX') : '—';
      const esAdmin = u.role === 'admin';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(u.nombre) || '—'}</td>
        <td>${esc(u.email)}</td>
        <td><span class="badge rol-${u.role}">${esAdmin ? 'Administrador' : 'Cliente'}</span></td>
        <td>${fecha}</td>
        <td class="acciones row-actions"></td>`;

      const acc = tr.querySelector('.acciones');

      const btnPass = document.createElement('button');
      btnPass.className = 'btn ghost sm';
      btnPass.textContent = 'Cambiar contraseña';
      btnPass.addEventListener('click', async () => {
        const nueva = prompt(`Nueva contraseña para ${u.email} (mín. 6 caracteres):`);
        if (!nueva) return;
        try {
          await api.patch(`users/${u.id}/password`, { password: nueva });
          alert('Contraseña actualizada.');
        } catch (err) { alert(err.message); }
      });

      const btnDel = document.createElement('button');
      btnDel.className = 'btn ghost sm';
      btnDel.style.color = 'var(--danger)';
      btnDel.textContent = 'Eliminar';
      btnDel.addEventListener('click', async () => {
        const aviso = u.role === 'cliente'
          ? `¿Eliminar a ${u.email}? Se eliminarán también sus solicitudes.`
          : `¿Eliminar a ${u.email}?`;
        if (!confirm(aviso)) return;
        try {
          await api.request('DELETE', `users/${u.id}`);
          cargar();
        } catch (err) { alert(err.message); }
      });

      acc.append(btnPass, btnDel);
      tbody.appendChild(tr);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      nombre: document.getElementById('u_nombre').value.trim(),
      email: document.getElementById('u_email').value.trim(),
      password: document.getElementById('u_password').value,
      role: document.getElementById('u_role').value,
    };
    try {
      await api.post('users', payload);
      form.reset();
      showMsg('Usuario creado correctamente.', 'ok');
      cargar();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  });

  document.addEventListener('sesion-lista', () => {
    if (APP.user.role === 'admin') cargar();
  });
})();
