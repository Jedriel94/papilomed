(function () {
  const tbody = document.getElementById('tbodySolicitudes');
  const empty = document.getElementById('emptySolicitudes');
  const filtro = document.getElementById('filtroSolicitud');
  const form = document.getElementById('formSolicitud');
  const msg = document.getElementById('msgSolicitud');
  const selMedico = document.getElementById('s_medico');

  const ESTATUS_FLUJO = ['pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada'];

  function showMsg(text, tipo) {
    msg.textContent = text;
    msg.className = 'msg ' + tipo;
  }

  async function cargar() {
    const q = filtro.value ? `?estatus=${filtro.value}` : '';
    const items = await api.get('solicitudes' + q);
    render(items);
  }

  function render(items) {
    tbody.innerHTML = '';
    empty.classList.toggle('hidden', items.length > 0);
    const esAdmin = APP.user.role === 'admin';

    for (const s of items) {
      const fecha = s.fecha_solicitada ? new Date(s.fecha_solicitada + 'T00:00:00').toLocaleDateString('es-MX') : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.id}</td>
        <td>${esc(s.hospital)}</td>
        <td>${esc(s.medico_nombre) || '—'}</td>
        <td>${esc(s.direccion)}</td>
        <td>${esc(s.contacto) || '—'}${s.telefono_contacto ? '<br><span class="muted">' + esc(s.telefono_contacto) + '</span>' : ''}</td>
        <td>${fecha}</td>
        <td class="col-cliente">${esc(s.cliente_nombre) || '—'}</td>
        <td><span class="badge ${s.estatus}">${LABELS[s.estatus]}</span></td>
        <td>${esc(s.asignado_nombre) || '—'}</td>
        <td class="acciones"></td>`;

      const acc = tr.querySelector('.acciones');
      if (esAdmin) {
        acc.appendChild(adminControls(s));
      } else {
        acc.innerHTML = '<span class="muted">—</span>';
      }
      if (APP.user.role === 'cliente') tr.querySelector('.col-cliente').classList.add('hidden');
      tbody.appendChild(tr);
    }
  }

  function adminControls(s) {
    const wrap = document.createElement('div');
    wrap.className = 'row-actions';

    const sel = document.createElement('select');
    sel.className = 'sm';
    for (const e of ESTATUS_FLUJO) {
      const opt = document.createElement('option');
      opt.value = e; opt.textContent = LABELS[e];
      if (e === s.estatus) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', async () => {
      try {
        await api.patch(`solicitudes/${s.id}/estatus`, { estatus: sel.value });
        cargar();
      } catch (err) { alert(err.message); }
    });
    wrap.appendChild(sel);

    const btn = document.createElement('button');
    btn.className = 'btn ghost sm';
    btn.textContent = s.asignado_a ? 'Reasignarme' : 'Asignarme';
    btn.addEventListener('click', async () => {
      try {
        await api.patch(`solicitudes/${s.id}/asignarme`, {});
        cargar();
      } catch (err) { alert(err.message); }
    });
    wrap.appendChild(btn);

    return wrap;
  }

  // Poblar el select de médicos en el formulario (solo cliente lo usa).
  async function cargarMedicosSelect() {
    if (!selMedico) return;
    try {
      const medicos = await api.get('medicos');
      selMedico.innerHTML = '<option value="">— Sin médico —</option>';
      for (const m of medicos) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.nombre_medico} · ${m.hospital}`;
        selMedico.appendChild(opt);
      }
    } catch (_) { /* ignore */ }
  }
  // Exponer para que el módulo de médicos refresque el select al agregar uno.
  window.recargarMedicosSelect = cargarMedicosSelect;

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        hospital: document.getElementById('s_hospital').value.trim(),
        medico_id: document.getElementById('s_medico').value || null,
        direccion: document.getElementById('s_direccion').value.trim(),
        contacto: document.getElementById('s_contacto').value.trim(),
        telefono_contacto: document.getElementById('s_telefono').value.trim(),
        fecha_solicitada: document.getElementById('s_fecha').value || null,
        notas: document.getElementById('s_notas').value.trim(),
      };
      try {
        await api.post('solicitudes', payload);
        form.reset();
        showMsg('Solicitud creada correctamente.', 'ok');
        cargar();
      } catch (err) {
        showMsg(err.message, 'error');
      }
    });
  }

  filtro.addEventListener('change', cargar);

  document.addEventListener('sesion-lista', () => {
    cargar();
    if (APP.user.role === 'cliente') cargarMedicosSelect();
  });
})();
