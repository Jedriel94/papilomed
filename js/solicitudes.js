(function () {
  const tbody = document.getElementById('tbodySolicitudes');
  const empty = document.getElementById('emptySolicitudes');
  const filtro = document.getElementById('filtroSolicitud');
  const form = document.getElementById('formSolicitud');
  const msg = document.getElementById('msgSolicitud');
  const selMedico = document.getElementById('s_medico');

  const ESTATUS_FLUJO = ['pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada'];
  const PAQUETERIAS = ['DHL', 'FedEx', 'Estafeta', 'UPS', 'Redpack', 'Otro'];

  // Plantillas de rastreo oficial por paquetería ({NUM} = número de guía).
  const RASTREO_URLS = {
    DHL: 'https://www.dhl.com/mx-es/home/rastreo.html?tracking-id={NUM}&submit=1',
    FedEx: 'https://www.fedex.com/fedextrack/?trknbr={NUM}',
    UPS: 'https://www.ups.com/track?tracknum={NUM}',
    Redpack: 'https://www.redpack.com.mx/es/rastreo/?guias={NUM}',
    Estafeta: 'https://www.estafeta.com/herramientas/rastreo',
    Otro: '',
  };

  function rastreoUrl(paqueteria, num) {
    const tpl = RASTREO_URLS[paqueteria];
    if (!tpl) return '';
    return tpl.replace('{NUM}', encodeURIComponent(num || ''));
  }
  function archivoUrl(id) {
    return API_BASE + 'solicitudes/' + id + '/guia-archivo';
  }
  function linkBtn(href, texto) {
    const a = document.createElement('a');
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.className = 'btn sm ghost';
    a.textContent = texto;
    return a;
  }

  function showMsg(text, tipo) {
    msg.textContent = text;
    msg.className = 'msg ' + tipo;
  }

  async function cargar() {
    const q = filtro.value ? `?estatus=${filtro.value}` : '';
    const items = await api.get('solicitudes' + q);
    render(items);
  }

  function fechaMX(f) {
    return f ? new Date(f + 'T00:00:00').toLocaleDateString('es-MX') : '—';
  }

  function render(items) {
    tbody.innerHTML = '';
    empty.classList.toggle('hidden', items.length > 0);
    const esAdmin = APP.user.role === 'admin';

    for (const s of items) {
      // Fila resumen (siempre visible).
      const tr = document.createElement('tr');
      tr.className = 'sol-row';
      const tieneGuia = s.guia_rastreo || s.guia_archivo;
      tr.innerHTML = `
        <td>${s.id}</td>
        <td>${esc(s.hospital)}</td>
        <td>${esc(s.medico_nombre) || '—'}</td>
        <td>${fechaMX(s.fecha_solicitada)}</td>
        <td>
          <span class="badge ${s.estatus}">${LABELS[s.estatus]}</span>
          ${tieneGuia ? '<span class="chip-guia">guía</span>' : ''}
        </td>
        <td class="caret">▸</td>`;

      // Fila detalle (oculta hasta hacer clic).
      const trd = document.createElement('tr');
      trd.className = 'sol-detail hidden';
      const td = document.createElement('td');
      td.colSpan = 6;
      td.appendChild(detallePanel(s, esAdmin));
      trd.appendChild(td);

      tr.addEventListener('click', () => {
        const oculto = trd.classList.toggle('hidden');
        tr.querySelector('.caret').textContent = oculto ? '▸' : '▾';
        tr.classList.toggle('abierta', !oculto);
      });

      tbody.appendChild(tr);
      tbody.appendChild(trd);
    }
  }

  // Panel de detalle que se muestra al expandir una solicitud.
  function detallePanel(s, esAdmin) {
    const wrap = document.createElement('div');
    wrap.className = 'detalle';

    const grid = document.createElement('div');
    grid.className = 'detalle-grid';
    const campos = [
      ['Dirección', esc(s.direccion) || '—'],
      ['Contacto', (esc(s.contacto) || '—') + (s.telefono_contacto ? ' · ' + esc(s.telefono_contacto) : '')],
      ['Fecha solicitada', fechaMX(s.fecha_solicitada)],
    ];
    if (esAdmin) campos.push(['Cliente', esc(s.cliente_nombre) || '—']);
    campos.push(['Asignado', esc(s.asignado_nombre) || '—']);
    campos.push(['Notas', esc(s.notas) || '—']);
    for (const [label, val] of campos) {
      const d = document.createElement('div');
      d.className = 'campo';
      d.innerHTML = `<span class="campo-label">${label}</span><span class="campo-val">${val}</span>`;
      grid.appendChild(d);
    }
    wrap.appendChild(grid);

    // Sección de guía / rastreo.
    const gsec = document.createElement('div');
    gsec.className = 'detalle-seccion';
    gsec.innerHTML = '<h4>Guía / Rastreo</h4>';
    gsec.appendChild(guiaCell(s, esAdmin));
    wrap.appendChild(gsec);

    // Acciones de estatus/asignación (solo admin).
    if (esAdmin) {
      const asec = document.createElement('div');
      asec.className = 'detalle-seccion';
      asec.innerHTML = '<h4>Estatus / Asignación</h4>';
      asec.appendChild(adminControls(s));
      wrap.appendChild(asec);
    }

    return wrap;
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

  // Celda de guía/rastreo. El cliente solo ve; el admin captura y sube.
  function guiaCell(s, esAdmin) {
    const wrap = document.createElement('div');
    const url = rastreoUrl(s.paqueteria, s.guia_rastreo);

    if (!esAdmin) {
      if (!s.guia_rastreo && !s.guia_archivo) {
        wrap.innerHTML = '<span class="muted">Sin guía aún</span>';
        return wrap;
      }
      if (s.paqueteria || s.guia_rastreo) {
        const info = document.createElement('div');
        info.innerHTML = `<b>${esc(s.paqueteria) || ''}</b> ${esc(s.guia_rastreo) || ''}`;
        wrap.appendChild(info);
      }
      const acciones = document.createElement('div');
      acciones.className = 'row-actions mt';
      if (url && s.guia_rastreo) acciones.appendChild(linkBtn(url, 'Rastrear'));
      if (s.guia_archivo) acciones.appendChild(linkBtn(archivoUrl(s.id), 'Ver guía'));
      if (acciones.children.length) wrap.appendChild(acciones);
      return wrap;
    }

    // --- Admin: captura de paquetería + número ---
    const selP = document.createElement('select');
    selP.className = 'sm';
    selP.style.maxWidth = '200px';
    [''].concat(PAQUETERIAS).forEach((p) => {
      const o = document.createElement('option');
      o.value = p;
      o.textContent = p === '' ? '— Paquetería —' : p;
      if (p === (s.paqueteria || '')) o.selected = true;
      selP.appendChild(o);
    });

    const inpN = document.createElement('input');
    inpN.className = 'sm';
    inpN.placeholder = 'N° de guía';
    inpN.value = s.guia_rastreo || '';
    inpN.style.maxWidth = '130px';

    const btnG = document.createElement('button');
    btnG.className = 'btn sm';
    btnG.textContent = 'Guardar';
    btnG.addEventListener('click', async () => {
      try {
        await api.patch(`solicitudes/${s.id}/guia`, {
          paqueteria: selP.value,
          guia_rastreo: inpN.value.trim(),
        });
        cargar();
      } catch (err) { alert(err.message); }
    });

    const fila1 = document.createElement('div');
    fila1.className = 'row-actions';
    fila1.append(selP, inpN, btnG);
    wrap.appendChild(fila1);

    // --- Admin: subir archivo de la guía (control limpio) ---
    const inpF = document.createElement('input');
    inpF.type = 'file';
    inpF.accept = '.pdf,.jpg,.jpeg,.png';
    inpF.id = 'guia-file-' + s.id;
    inpF.className = 'file-hidden';

    const lblF = document.createElement('label');
    lblF.className = 'btn sm ghost';
    lblF.setAttribute('for', inpF.id);
    lblF.textContent = 'Elegir archivo…';

    const nombreF = document.createElement('span');
    nombreF.className = 'muted file-nombre';
    nombreF.textContent = 'Ningún archivo';
    inpF.addEventListener('change', () => {
      nombreF.textContent = inpF.files && inpF.files[0] ? inpF.files[0].name : 'Ningún archivo';
    });

    const btnF = document.createElement('button');
    btnF.className = 'btn sm naranja';
    btnF.textContent = 'Subir guía';
    btnF.addEventListener('click', async () => {
      if (!inpF.files || !inpF.files[0]) { alert('Elige un archivo (PDF, JPG o PNG).'); return; }
      const fd = new FormData();
      fd.append('archivo', inpF.files[0]);
      btnF.disabled = true;
      try {
        const res = await fetch(archivoUrl(s.id), { method: 'POST', credentials: 'same-origin', body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || ('Error ' + res.status));
        cargar();
      } catch (err) {
        alert(err.message);
        btnF.disabled = false;
      }
    });

    const fila2 = document.createElement('div');
    fila2.className = 'row-actions mt';
    fila2.append(inpF, lblF, nombreF, btnF);
    wrap.appendChild(fila2);

    // --- Admin: enlaces existentes ---
    const fila3 = document.createElement('div');
    fila3.className = 'row-actions mt';
    if (url && s.guia_rastreo) fila3.appendChild(linkBtn(url, 'Rastrear'));
    if (s.guia_archivo) fila3.appendChild(linkBtn(archivoUrl(s.id), 'Ver guía'));
    if (fila3.children.length) wrap.appendChild(fila3);

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
