(function () {
  const tbody = document.getElementById('tbodyMedicos');
  const empty = document.getElementById('emptyMedicos');
  const filtro = document.getElementById('filtroMedico');
  const form = document.getElementById('formMedico');
  const msg = document.getElementById('msgMedico');

  const selHosp = document.getElementById('m_hospital_sel');
  const dirWrap = document.getElementById('m_hosp_dir_wrap');
  const dirView = document.getElementById('m_hosp_dir_view');
  const nombreNuevoWrap = document.getElementById('m_hosp_nombre_wrap');
  const dirNuevoWrap = document.getElementById('m_hosp_direccion_wrap');

  // ---- Helper compartido de hospitales (lo usa también el form de solicitudes) ----
  window.Hospitales = window.Hospitales || {
    list: [],
    byId: {},
    async load() {
      try { this.list = await api.get('hospitales'); }
      catch (_) { this.list = []; }
      this.byId = {};
      for (const h of this.list) this.byId[String(h.id)] = h;
      document.dispatchEvent(new Event('hospitales-cargados'));
      return this.list;
    },
    // Rellena un <select> con: placeholder, hospitales, opción "nuevo".
    fill(sel, mantener) {
      const prev = mantener != null ? String(mantener) : sel.value;
      sel.innerHTML = '<option value="">— Elige un hospital —</option>';
      for (const h of this.list) {
        const o = document.createElement('option');
        o.value = String(h.id);
        o.textContent = h.nombre;
        sel.appendChild(o);
      }
      const nuevo = document.createElement('option');
      nuevo.value = '__nuevo__';
      nuevo.textContent = '➕ Nuevo hospital…';
      sel.appendChild(nuevo);
      if (prev && (prev === '__nuevo__' || this.byId[prev])) sel.value = prev;
    },
  };

  function showMsg(text, tipo) {
    msg.textContent = text;
    msg.className = 'msg ' + tipo;
  }

  async function cargar() {
    const q = filtro.value ? `?estatus=${filtro.value}` : '';
    const items = await api.get('medicos' + q);
    render(items);
  }

  function render(items) {
    tbody.innerHTML = '';
    empty.classList.toggle('hidden', items.length > 0);

    for (const m of items) {
      const dejada = m.estatus === 'muestra_dejada';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(m.nombre_medico)}</td>
        <td>${esc(m.hospital) || '—'}</td>
        <td>${esc(m.ubicacion) || '—'}</td>
        <td>${esc(m.telefono) || '—'}</td>
        <td>${m.muestras == null || m.muestras === '' ? '—' : esc(m.muestras)}</td>
        <td>${esc(m.notas) || '—'}</td>
        <td><span class="badge ${m.estatus}">${LABELS[m.estatus]}</span></td>
        <td class="acciones"></td>`;

      const btn = document.createElement('button');
      btn.className = 'btn sm ' + (dejada ? 'ghost' : 'naranja');
      btn.textContent = dejada ? 'Marcar pendiente' : 'Marcar muestra dejada';
      btn.addEventListener('click', async () => {
        try {
          await api.patch(`medicos/${m.id}/estatus`, { estatus: dejada ? 'pendiente' : 'muestra_dejada' });
          cargar();
        } catch (err) { alert(err.message); }
      });
      tr.querySelector('.acciones').appendChild(btn);
      tbody.appendChild(tr);
    }
  }

  // Muestra/oculta los campos según el hospital elegido.
  function actualizarHospitalUI() {
    const v = selHosp.value;
    if (v === '__nuevo__') {
      dirWrap.classList.add('hidden');
      nombreNuevoWrap.classList.remove('hidden');
      dirNuevoWrap.classList.remove('hidden');
    } else {
      nombreNuevoWrap.classList.add('hidden');
      dirNuevoWrap.classList.add('hidden');
      dirWrap.classList.remove('hidden');
      const h = window.Hospitales.byId[v];
      dirView.value = h ? h.direccion : '';
    }
  }
  selHosp.addEventListener('change', actualizarHospitalUI);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      nombre_medico: document.getElementById('m_nombre').value.trim(),
      ubicacion: document.getElementById('m_ubicacion').value.trim(),
      telefono: document.getElementById('m_telefono').value.trim(),
      muestras: document.getElementById('m_muestras').value,
      estatus: document.getElementById('m_estatus').value,
      notas: document.getElementById('m_notas').value.trim(),
    };

    const v = selHosp.value;
    if (v === '__nuevo__') {
      payload.hospital_nombre = document.getElementById('m_hosp_nombre').value.trim();
      payload.hospital_direccion = document.getElementById('m_hosp_direccion').value.trim();
      if (!payload.hospital_nombre || !payload.hospital_direccion) {
        showMsg('Escribe el nombre y la dirección del nuevo hospital.', 'error');
        return;
      }
    } else if (v) {
      payload.hospital_id = v;
    } else {
      showMsg('Elige un hospital (o agrega uno nuevo).', 'error');
      return;
    }

    try {
      await api.post('medicos', payload);
      form.reset();
      selHosp.value = '';
      actualizarHospitalUI();
      showMsg('Médico agregado correctamente.', 'ok');
      await window.Hospitales.load(); // por si se creó un hospital nuevo
      document.dispatchEvent(new Event('medicos-cambio'));
      cargar();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  });

  filtro.addEventListener('change', cargar);

  document.addEventListener('hospitales-cargados', () => window.Hospitales.fill(selHosp));
  document.addEventListener('medicos-cambio', cargar);

  document.addEventListener('sesion-lista', async () => {
    await window.Hospitales.load();
    cargar();
  });
})();
