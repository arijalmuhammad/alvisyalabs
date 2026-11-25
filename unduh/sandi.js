/* Kata sandi sebelum mengunduh (IPB123, permintaan pemilik). Penghalang ringan di halaman: berkasnya sendiri tetap
   berada di alamat publik. Sekali benar, diingat selama tab ini terbuka. */
(() => {
  // shortcut: sandi tetap di kode halaman (bisa dibaca siapa pun yang membuka sumber halaman); ganti = ubah baris ini
  const SANDI = 'IPB123', KUNCI = 'alvisyaUnduhOk';
  const sudah = () => { try { return sessionStorage.getItem(KUNCI) === '1'; } catch (e) { return false; } };
  const css = document.createElement('style');
  css.textContent = `
  .sd{border:0;padding:0;border-radius:16px;width:min(92vw,380px);background:var(--kartu,#fff);color:var(--tinta,#0F2742);box-shadow:0 24px 48px rgba(15,39,66,.24)}
  .sd::backdrop{background:rgba(15,39,66,.45)}
  .sd form{padding:24px;display:grid;gap:12px}
  .sd h2{margin:0;font-size:19px}
  .sd p{margin:0;color:var(--redup,#4F6478);font-size:15px}
  .sd label{font-weight:600;font-size:14px}
  .sd input{width:100%;min-height:48px;padding:0 14px;border:1px solid var(--garis,#D6DCE8);border-radius:10px;font:inherit;font-size:17px;background:transparent;color:inherit}
  .sd input:focus-visible,.sd button:focus-visible{outline:2px solid var(--utama,#263C92);outline-offset:2px}
  .sd .salah{min-height:20px;color:#B91C1C;font-size:14px}
  .sd .tb{display:flex;gap:8px;justify-content:flex-end}
  .sd button{min-height:44px;padding:0 18px;border-radius:10px;font:600 15px system-ui,sans-serif;cursor:pointer;border:1px solid var(--utama,#263C92);background:transparent;color:var(--utama,#263C92)}
  .sd button.utama{background:var(--utama,#263C92);color:#fff}`;
  document.head.appendChild(css);
  const d = document.createElement('dialog');
  d.className = 'sd'; d.setAttribute('aria-labelledby', 'sdJudul');
  d.innerHTML = '<form method="dialog" novalidate><h2 id="sdJudul">Masukkan kata sandi</h2><p>Unduhan khusus tenaga Klinik IPB.</p>' +
    '<label for="sdIsi">Kata sandi</label><input id="sdIsi" type="password" autocomplete="off" required>' +
    '<div class="salah" id="sdSalah" role="alert"></div>' +
    '<div class="tb"><button type="button" id="sdBatal">Batal</button><button class="utama" type="submit" id="sdOk">Unduh</button></div></form>';
  document.body.appendChild(d);
  let tujuan = null;
  const isi = d.querySelector('#sdIsi'), salah = d.querySelector('#sdSalah');
  d.querySelector('#sdBatal').addEventListener('click', () => d.close());
  d.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    if (isi.value.trim() !== SANDI) { salah.textContent = 'Kata sandi salah. Coba lagi.'; isi.select(); return; }
    try { sessionStorage.setItem(KUNCI, '1'); } catch (err) { /* tanpa penyimpanan: cukup untuk klik ini */ }
    d.close(); const a = tujuan; tujuan = null; if (a) { a.dataset.lolos = '1'; a.click(); delete a.dataset.lolos; }
  });
  /* Berkas besar (> batas GitHub) disimpan berpotongan; digabung di peramban, dicek SHA-256, lalu disimpan sebagai satu berkas */
  async function gabung(a) {
    if (a.dataset.jalan) return; a.dataset.jalan = '1';
    const label = a.querySelector('.label') || a, asli = label.textContent, n = +a.dataset.bagian, dasar = a.dataset.gabung;
    const bagian = [];
    try {
      for (let i = 0; i < n; i++) {
        label.textContent = 'Mengunduh ' + Math.round(i / n * 100) + '%';
        const r = await fetch(dasar + '.' + String(i).padStart(3, '0'), { cache: 'no-store' });
        if (!r.ok) throw new Error('bagian ' + i + ' HTTP ' + r.status);
        bagian.push(await r.arrayBuffer());
      }
      label.textContent = 'Memeriksa berkas…';
      const blob = new Blob(bagian, { type: 'application/octet-stream' });
      const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
      if (h !== a.dataset.sha256) throw new Error('berkas tidak utuh');
      const u = URL.createObjectURL(blob), t = document.createElement('a');
      t.href = u; t.download = a.dataset.nama; document.body.appendChild(t); t.click(); t.remove();
      setTimeout(() => URL.revokeObjectURL(u), 60000);
      label.textContent = 'Selesai — cek folder Unduhan';
      setTimeout(() => { label.textContent = asli; }, 6000);
    } catch (err) {
      console.warn('[unduh] gagal:', err.message);
      label.textContent = 'Gagal, ketuk untuk coba lagi';
    } finally { delete a.dataset.jalan; }
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-unduh]');
    if (!a) return;
    if (a.dataset.lolos || sudah()) { if (a.dataset.gabung) { e.preventDefault(); gabung(a); } return; }
    e.preventDefault(); tujuan = a; isi.value = ''; salah.textContent = '';
    d.querySelector('#sdOk').textContent = a.dataset.unduh || 'Unduh';
    d.showModal(); isi.focus();
  });
})();
