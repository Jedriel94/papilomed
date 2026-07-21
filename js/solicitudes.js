(function () {
  const tbody = document.getElementById('tbodySolicitudes');
  const empty = document.getElementById('emptySolicitudes');
  const filtro = document.getElementById('filtroSolicitud');
  const form = document.getElementById('formSolicitud');
  const msg = document.getElementById('msgSolicitud');

  // Formulario de solicitud (solo cliente lo usa).
  const filtroHosp = document.getElementById('s_hospital_filtro');
  const selMedico = document.getElementById('s_medico');
  const dirView = document.getElementById('s_direccion_view');

  const ESTATUS_FLUJO = ['pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada'];
  const PAQUETERIAS = ['DHL', 'FedEx', 'Estafeta', 'UPS', 'Redpack', 'Otro'];

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

    for (const item of items) {
      let s = item;

      const tr = document.createElement('tr');
      tr.className = 'sol-row';
      const cId = document.createElement('td'); cId.textContent = s.id;
      const cHosp = document.createElement('td'); cHosp.textContent = s.hospital || '';
      const cMed = document.createElement('td'); cMed.textContent = s.medico_nombre || '—';
      const cFecha = document.createElement('td'); cFecha.textContent = fechaMX(s.fecha_solicitada);
      const cEstatus = document.createElement('td');
      const cCaret = document.createElement('td'); cCaret.className = 'caret'; cCaret.textContent = '▸';
      tr.append(cId, cHosp, cMed, cFecha, cEstatus, cCaret);

      const trd = document.createElement('tr');
      trd.className = 'sol-detail hidden';
      const td = document.createElement('td');
      td.colSpan = 6;
      trd.appendChild(td);

      function pintarEstatus() {
        const tieneGuia = s.guia_rastreo || s.guia_archivo;
        cEstatus.innerHTML =
          `<span class="badge ${s.estatus}">${LABELS[s.estatus]}</span>` +
          (tieneGuia ? ' <span class="chip-guia">guía</span>' : '');
      }
      function pintarDetalle() {
        td.innerHTML = '';
        td.appendChild(detallePanel(s, esAdmin, refrescar));
      }
      // Actualiza la fila EN SU LUGAR (sin cerrar el detalle) tras una acción.
      function refrescar(nuevo) {
        if (nuevo) s = nuevo;
        pintarEstatus();
        pintarDetalle();
      }

      pintarEstatus();
      pintarDetalle();

      tr.addEventListener('click', () => {
        const oculto = trd.classList.toggle('hidden');
        cCaret.textContent = oculto ? '▸' : '▾';
        tr.classList.toggle('abierta', !oculto);
      });

      tbody.appendChild(tr);
      tbody.appendChild(trd);
    }
  }

  function detallePanel(s, esAdmin, refrescar) {
    const wrap = document.createElement('div');
    wrap.className = 'detalle';

    const grid = document.createElement('div');
    grid.className = 'detalle-grid';
    const campos = [
      ['Dirección de recolección', esc(s.direccion) || '—'],
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

    const gsec = document.createElement('div');
    gsec.className = 'detalle-seccion';
    gsec.innerHTML = '<h4>Guía / Rastreo</h4>';
    gsec.appendChild(guiaCell(s, esAdmin, refrescar));
    wrap.appendChild(gsec);

    if (esAdmin) {
      const asec = document.createElement('div');
      asec.className = 'detalle-seccion';
      asec.innerHTML = '<h4>Estatus / Asignación</h4>';
      asec.appendChild(adminControls(s, refrescar));
      wrap.appendChild(asec);
    }
    return wrap;
  }

  function adminControls(s, refrescar) {
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
        const r = await api.patch(`solicitudes/${s.id}/estatus`, { estatus: sel.value });
        refrescar(r);
      } catch (err) { alert(err.message); }
    });
    wrap.appendChild(sel);

    const btn = document.createElement('button');
    btn.className = 'btn ghost sm';
    btn.textContent = s.asignado_a ? 'Reasignarme' : 'Asignarme';
    btn.addEventListener('click', async () => {
      try {
        const r = await api.patch(`solicitudes/${s.id}/asignarme`, {});
        refrescar(r);
      } catch (err) { alert(err.message); }
    });
    wrap.appendChild(btn);

    const btnDel = document.createElement('button');
    btnDel.className = 'btn ghost sm';
    btnDel.style.color = 'var(--danger)';
    btnDel.textContent = 'Eliminar';
    btnDel.addEventListener('click', async () => {
      if (!window.confirmarEliminacion(`la solicitud #${s.id}`)) return;
      try {
        await api.request('DELETE', `solicitudes/${s.id}`);
        cargar();
      } catch (err) { alert(err.message); }
    });
    wrap.appendChild(btnDel);
    return wrap;
  }

  function guiaCell(s, esAdmin, refrescar) {
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
        const r = await api.patch(`solicitudes/${s.id}/guia`, { paqueteria: selP.value, guia_rastreo: inpN.value.trim() });
        refrescar(r);
      } catch (err) { alert(err.message); }
    });

    const fila1 = document.createElement('div');
    fila1.className = 'row-actions';
    fila1.append(selP, inpN, btnG);
    wrap.appendChild(fila1);

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
        refrescar(data);
      } catch (err) {
        alert(err.message);
        btnF.disabled = false;
      }
    });

    const fila2 = document.createElement('div');
    fila2.className = 'row-actions mt';
    fila2.append(inpF, lblF, nombreF, btnF);
    wrap.appendChild(fila2);

    const fila3 = document.createElement('div');
    fila3.className = 'row-actions mt';
    if (url && s.guia_rastreo) fila3.appendChild(linkBtn(url, 'Rastrear'));
    if (s.guia_archivo) fila3.appendChild(linkBtn(archivoUrl(s.id), 'Ver guía'));
    if (fila3.children.length) wrap.appendChild(fila3);

    return wrap;
  }

  // ==================== Formulario de nueva solicitud (cliente) ====================
  let medicosCache = [];

  function dirRecoleccion(m) {
    let d = m.direccion || '';
    if (m.ubicacion) d = (d ? d + ' · ' : '') + m.ubicacion;
    return d;
  }

  function poblarHospitalFiltro() {
    const prev = filtroHosp.value;
    const vistos = new Set();
    filtroHosp.innerHTML = '<option value="">— Todos los hospitales —</option>';
    for (const m of medicosCache) {
      const hid = m.hospital_id != null ? String(m.hospital_id) : '';
      if (!hid || vistos.has(hid)) continue;
      vistos.add(hid);
      const o = document.createElement('option');
      o.value = hid;
      o.textContent = m.hospital;
      filtroHosp.appendChild(o);
    }
    if (prev && vistos.has(prev)) filtroHosp.value = prev;
  }

  function poblarMedicoSelect() {
    const pending = selMedico._pending;
    const prev = pending || selMedico.value;
    const hf = filtroHosp.value;
    selMedico.innerHTML = '<option value="">— Elige un médico —</option>';
    for (const m of medicosCache) {
      if (hf && String(m.hospital_id) !== hf) continue;
      const o = document.createElement('option');
      o.value = String(m.id);
      const partes = [m.nombre_medico, m.hospital || 'sin hospital'];
      if (m.ubicacion) partes.push(m.ubicacion);
      o.textContent = partes.join(' · ');
      selMedico.appendChild(o);
    }
    const sigueValido = medicosCache.some(
      (m) => String(m.id) === String(prev) && (!hf || String(m.hospital_id) === hf)
    );
    selMedico.value = sigueValido ? String(prev) : '';
    if (pending) selMedico._pending = null;
    actualizarDireccionView();
  }

  function actualizarDireccionView() {
    const m = medicosCache.find((x) => String(x.id) === selMedico.value);
    dirView.value = m ? dirRecoleccion(m) : '';
  }

  async function cargarMedicos() {
    if (!APP.user || APP.user.role !== 'cliente') return;
    try {
      medicosCache = await api.get('medicos');
    } catch (_) { medicosCache = []; }
    poblarHospitalFiltro();
    poblarMedicoSelect();
  }

  if (filtroHosp) filtroHosp.addEventListener('change', poblarMedicoSelect);
  if (selMedico) selMedico.addEventListener('change', actualizarDireccionView);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const medico_id = selMedico.value;
      if (!medico_id) { showMsg('Elige un médico para la solicitud.', 'error'); return; }
      const payload = {
        medico_id,
        contacto: document.getElementById('s_contacto').value.trim(),
        telefono_contacto: document.getElementById('s_telefono').value.trim(),
        fecha_solicitada: document.getElementById('s_fecha').value || null,
        notas: document.getElementById('s_notas').value.trim(),
      };
      try {
        await api.post('solicitudes', payload);
        // Limpiar sin borrar los catálogos.
        document.getElementById('s_contacto').value = '';
        document.getElementById('s_telefono').value = '';
        document.getElementById('s_fecha').value = '';
        document.getElementById('s_notas').value = '';
        filtroHosp.value = '';
        poblarMedicoSelect();
        showMsg('Solicitud creada correctamente.', 'ok');
        cargar();
      } catch (err) {
        showMsg(err.message, 'error');
      }
    });
  }

  // ---------- Alta rápida de médico dentro del formulario ----------
  const nmWrap = document.getElementById('s_nuevo_medico');
  const nmBtn = document.getElementById('s_nuevo_medico_btn');
  const nmHospSel = document.getElementById('nm_hospital_sel');
  const nmMsg = document.getElementById('nm_msg');
  const nmHospNombreWrap = document.getElementById('nm_hosp_nombre_wrap');
  const nmHospDirWrap = document.getElementById('nm_hosp_direccion_wrap');

  if (nmBtn) {
    nmBtn.addEventListener('click', () => nmWrap.classList.toggle('hidden'));
  }
  if (nmHospSel) {
    nmHospSel.addEventListener('change', () => {
      const nuevo = nmHospSel.value === '__nuevo__';
      nmHospNombreWrap.classList.toggle('hidden', !nuevo);
      nmHospDirWrap.classList.toggle('hidden', !nuevo);
    });
  }
  const nmGuardar = document.getElementById('nm_guardar');
  if (nmGuardar) {
    nmGuardar.addEventListener('click', async () => {
      const nombre = document.getElementById('nm_nombre').value.trim();
      if (!nombre) { nmMsg.textContent = 'Escribe el nombre del médico.'; nmMsg.className = 'msg error'; return; }
      const payload = {
        nombre_medico: nombre,
        ubicacion: document.getElementById('nm_ubicacion').value.trim(),
        muestras: document.getElementById('nm_muestras').value,
      };
      const hv = nmHospSel.value;
      if (hv === '__nuevo__') {
        payload.hospital_nombre = document.getElementById('nm_hosp_nombre').value.trim();
        payload.hospital_direccion = document.getElementById('nm_hosp_direccion').value.trim();
        if (!payload.hospital_nombre || !payload.hospital_direccion) {
          nmMsg.textContent = 'Escribe el nombre y la dirección del nuevo hospital.'; nmMsg.className = 'msg error'; return;
        }
      } else if (hv) {
        payload.hospital_id = hv;
      } else {
        nmMsg.textContent = 'Elige un hospital (o agrega uno nuevo).'; nmMsg.className = 'msg error'; return;
      }

      try {
        const nuevo = await api.post('medicos', payload);
        await window.Hospitales.load();
        // Limpiar la mini-forma y ocultarla.
        ['nm_nombre', 'nm_ubicacion', 'nm_muestras', 'nm_hosp_nombre', 'nm_hosp_direccion'].forEach((id) => {
          const el = document.getElementById(id); if (el) el.value = '';
        });
        nmHospSel.value = '';
        nmHospNombreWrap.classList.add('hidden');
        nmHospDirWrap.classList.add('hidden');
        nmWrap.classList.add('hidden');
        nmMsg.className = 'msg hidden';
        // Recargar médicos y dejar seleccionado el nuevo.
        filtroHosp.value = '';
        selMedico._pending = String(nuevo.id);
        document.dispatchEvent(new Event('medicos-cambio'));
        showMsg('Médico creado y seleccionado.', 'ok');
      } catch (err) {
        nmMsg.textContent = err.message; nmMsg.className = 'msg error';
      }
    });
  }

  // ---------- Eventos ----------
  filtro.addEventListener('change', cargar);
  document.addEventListener('hospitales-cargados', () => {
    if (nmHospSel) window.Hospitales.fill(nmHospSel);
  });
  document.addEventListener('medicos-cambio', cargarMedicos);

  document.addEventListener('sesion-lista', () => {
    cargar();
    cargarMedicos();
  });
})();
