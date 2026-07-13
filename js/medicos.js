(function () {
  const tbody = document.getElementById('tbodyMedicos');
  const empty = document.getElementById('emptyMedicos');
  const filtro = document.getElementById('filtroMedico');
  const form = document.getElementById('formMedico');
  const msg = document.getElementById('msgMedico');

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
        <td>${esc(m.hospital)}</td>
        <td>${esc(m.direccion) || '—'}</td>
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
          await api.patch(`medicos/${m.id}/estatus`, {
            estatus: dejada ? 'pendiente' : 'muestra_dejada',
          });
          cargar();
        } catch (err) { alert(err.message); }
      });
      tr.querySelector('.acciones').appendChild(btn);
      tbody.appendChild(tr);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      nombre_medico: document.getElementById('m_nombre').value.trim(),
      hospital: document.getElementById('m_hospital').value.trim(),
      direccion: document.getElementById('m_direccion').value.trim(),
      telefono: document.getElementById('m_telefono').value.trim(),
      muestras: document.getElementById('m_muestras').value,
      estatus: document.getElementById('m_estatus').value,
      notas: document.getElementById('m_notas').value.trim(),
    };
    try {
      await api.post('medicos', payload);
      form.reset();
      showMsg('Médico agregado correctamente.', 'ok');
      cargar();
      // Refresca el select de médicos del formulario de solicitudes.
      if (window.recargarMedicosSelect) window.recargarMedicosSelect();
    } catch (err) {
      showMsg(err.message, 'error');
    }
  });

  filtro.addEventListener('change', cargar);

  document.addEventListener('sesion-lista', cargar);
})();
