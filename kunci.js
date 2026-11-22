/* Kunci aplikasi AlvisyaLabs — PIN 4 angka (+ sidik jari) saat MEMBUKA AlvisyaLabs, bukan per fitur.
 * Halaman muka: tampilkan layar kunci bila sesi belum terbuka.  Halaman lain (CCare Plus, apl/…): AlvisyaKunci.jaga()
 * mengalihkan ke halaman muka (?ke=…) bila sesi belum terbuka, lalu kembali ke halaman itu setelah PIN benar.
 * Sesi = sessionStorage (hilang bila aplikasi ditutup); ditinggal > 1 menit = terkunci lagi.
 * 5x salah / Lupa PIN → data CCare Plus di perangkat ini dihapus (bisa ditarik ulang dari Sheet). Logbook tidak dihapus. */
(function () {
  'use strict';
  const AKAR = new URL('./', document.currentScript.src).href;   // akar situs (tempat kunci.js)
  const LS = 'ccareplus.kunci', PANJANG = 4, MAKS = 5, JEDA = 60e3, S_BUKA = 'alvisya.buka', S_TINGGAL = 'alvisya.tinggal';
  const ls = { get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { } } };
  const K = () => ls.get(LS) || {};
  const adaPin = () => !!K().hash;
  const terbuka = () => { const t = Number(ss.get(S_TINGGAL) || 0); return ss.get(S_BUKA) === '1' && !(t && Date.now() - t > JEDA); };
  const tandaiBuka = () => { ss.set(S_BUKA, '1'); ss.set(S_TINGGAL, null); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const b64 = (u) => btoa(String.fromCharCode(...new Uint8Array(u))), dariB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function hashPin(pin, garam) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: dariB64(garam), iterations: 150000 }, k, 256));
  }
  const AL = () => window.AlvisyaLabs || {};
  /** sidik jari: APK → BiometricPrompt Android; peramban → WebAuthn perangkat (Windows Hello, Touch ID, sidik jari Android) */
  const Bio = {
    apk: () => !!AL().sidikJari,
    async ada() {
      if (Bio.apk()) return !!(AL().adaSidikJari && AL().adaSidikJari());
      try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
    },
    async daftar() {
      if (Bio.apk()) return await Bio.periksa('apk') ? 'apk' : null;
      const c = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'AlvisyaLabs' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'alvisyalabs', displayName: 'AlvisyaLabs' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000 } }).catch(() => null);
      return c ? b64(c.rawId) : null;
    },
    periksa(id) {
      if (Bio.apk()) return new Promise((ok) => { window.__sidikJari = (h) => { window.__sidikJari = null; ok(!!h); }; AL().sidikJari(); });
      return navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: dariB64(id) }], userVerification: 'required', timeout: 60000 } }).then(() => true, () => false);
    },
  };
  /** data CCare Plus di perangkat ini (sambungan, salinan Sheet, antrean) + PIN. Logbook dan Meja Utama tidak disentuh. */
  function hapusData() {
    try { indexedDB.deleteDatabase('ccareplus'); } catch (e) { }
    try { Object.keys(localStorage).filter((k) => /^jasaipb\./.test(k)).forEach((k) => localStorage.removeItem(k)); } catch (e) { }
    ls.set(LS, null); ss.set(S_BUKA, null);
  }

  const CSS = `.akunci{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;
    background:var(--ak-bg);color:var(--ak-teks);font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    padding:max(24px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));overflow-y:auto;
    --ak-bg:#f4f8f7;--ak-teks:#0f2742;--ak-teks2:#4b6075;--ak-tombol:#fff;--ak-garis:#d3dfdd;--ak-aksen:#0f8a7e;--ak-tipis:#d6efeb;--ak-merah:#b42318}
  @media (prefers-color-scheme:dark){.akunci{--ak-bg:#0b1726;--ak-teks:#e8eef5;--ak-teks2:#a3b3c6;--ak-tombol:#12233a;--ak-garis:#24384f;--ak-aksen:#4fd1c1;--ak-tipis:#123b3a;--ak-merah:#f97066}}
  .akunci img{width:56px;height:56px}.akunci h1{font-size:21px;margin:4px 0 0;font-weight:800}.akunci .ak-ket{max-width:300px;min-height:20px;margin:0;color:var(--ak-teks2);font-size:15px}.akunci .ak-ket.salah{color:var(--ak-merah);font-weight:600}
  .ak-titik{display:flex;gap:16px;margin:8px 0 12px}.ak-titik i{width:15px;height:15px;border-radius:50%;border:2px solid var(--ak-aksen);transition:background-color .12s}.ak-titik i.isi{background:var(--ak-aksen)}
  .ak-papan{display:grid;grid-template-columns:repeat(3,74px);gap:14px}
  .ak-papan button{width:74px;height:74px;border-radius:50%;border:1px solid var(--ak-garis);background:var(--ak-tombol);color:var(--ak-teks);font:inherit;font-size:27px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .08s,background-color .12s;touch-action:manipulation}
  .ak-papan button:active{transform:scale(.92);background:var(--ak-tipis)}.ak-papan button.polos{border-color:transparent;background:none;font-size:14px;color:var(--ak-aksen)}.ak-papan button:disabled{visibility:hidden}
  .ak-teks{border:0;background:none;color:var(--ak-aksen);font:inherit;font-weight:600;font-size:14px;min-height:44px;padding:0 12px;cursor:pointer}
  .ak-tombol{display:flex;flex-direction:column;gap:10px;width:100%;max-width:300px}
  .ak-tb{min-height:48px;border-radius:999px;border:1px solid var(--ak-garis);background:var(--ak-tombol);color:var(--ak-teks);font:inherit;font-weight:700;cursor:pointer}.ak-tb.utama{background:var(--ak-teks);color:var(--ak-bg);border-color:var(--ak-teks)}.ak-tb.bahaya{background:var(--ak-merah);border-color:var(--ak-merah);color:#fff}
  .akunci.goyang .ak-titik{animation:akGoyang .32s}@keyframes akGoyang{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  @media (max-height:620px){.ak-papan{grid-template-columns:repeat(3,62px);gap:10px}.ak-papan button{width:62px;height:62px;font-size:23px}}
  @media (prefers-reduced-motion:reduce){.akunci *{transition:none!important;animation:none!important}}`;

  /** layar kunci. mode 'buka' | 'buat'. Selesai = true; data dihapus (5x salah / lupa PIN) = false */
  function layar(mode) {
    const lama = document.getElementById('akunci'); if (lama) return lama.janji;
    if (!document.getElementById('akunci-gaya')) { const st = document.createElement('style'); st.id = 'akunci-gaya'; st.textContent = CSS; document.head.appendChild(st); }
    const el = document.createElement('div'); el.id = 'akunci'; el.className = 'akunci'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'akJudul');
    document.body.appendChild(el); const luap = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    let isi = '', pertama = '', sibuk = false, selesai;
    el.janji = new Promise((r) => { selesai = r; });
    const tutup = (h) => { document.removeEventListener('keydown', ketik, true); el.remove(); document.documentElement.style.overflow = luap; if (h) tandaiBuka(); selesai(h); };
    const logo = `<img src="${AKAR}ikon/alvisya-simbol.svg" alt="">`;
    const sidik = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 11v3a8 8 0 0 1-1.5 4.7M8 9.5a4 4 0 0 1 8 0V12a12 12 0 0 1-.8 4.3M5 15.5V11a7 7 0 0 1 12.2-4.7M19 10.5v1.5a16 16 0 0 1-.5 4M9 21a11 11 0 0 0 2-6.5"/></svg>';
    const pj = () => mode === 'buka' ? (K().pj || 6) : PANJANG;   // PIN lama 6 angka tetap bisa dipakai sampai diganti
    function gambar(ket, salah) {
      const judul = mode === 'buka' ? 'AlvisyaLabs terkunci' : pertama ? 'Ulangi PIN' : 'Buat PIN ' + PANJANG + ' angka';
      const sub = mode === 'buka' ? 'Masukkan PIN' + (K().bio ? ' atau pakai sidik jari' : '') : pertama ? 'Ketik sekali lagi untuk memastikan.' : 'PIN melindungi data jasa dan nama pasien di perangkat ini.';
      el.innerHTML = `${logo}<h1 id="akJudul">${judul}</h1><p class="ak-ket${salah ? ' salah' : ''}" role="status">${esc(ket || sub)}</p>
        <div class="ak-titik" aria-label="${isi.length} dari ${pj()} angka">${Array.from({ length: pj() }, (_, i) => `<i class="${i < isi.length ? 'isi' : ''}"></i>`).join('')}</div>
        <div class="ak-papan">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-n="${n}">${n}</button>`).join('')}
          ${mode === 'buka' && K().bio ? `<button type="button" class="polos" data-k="bio" aria-label="Buka dengan sidik jari">${sidik}</button>` : '<button type="button" disabled aria-hidden="true"></button>'}
          <button type="button" data-n="0">0</button><button type="button" class="polos" data-k="hapus" aria-label="Hapus angka">Hapus</button></div>
        ${mode === 'buka' ? '<button type="button" class="ak-teks" data-k="lupa">Lupa PIN?</button>' : ''}`;
      el.querySelectorAll('[data-n]').forEach((b) => b.onclick = () => tekan(b.dataset.n));
      el.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => ({ hapus: () => tekan('h'), bio: pakaiBio, lupa: tanyaLupa })[b.dataset.k]());
      if (salah) { el.classList.remove('goyang'); void el.offsetWidth; el.classList.add('goyang'); try { navigator.vibrate && navigator.vibrate(40); } catch (e) { } }
    }
    function ketik(e) { if (/^[0-9]$/.test(e.key)) { e.preventDefault(); tekan(e.key); } else if (e.key === 'Backspace') { e.preventDefault(); tekan('h'); } }
    async function tekan(n) {
      if (sibuk || !el.querySelector('.ak-papan')) return;
      if (n === 'h') { isi = isi.slice(0, -1); return gambar(); }
      if (isi.length >= pj()) return;
      isi += n; gambar();
      if (isi.length < pj()) return;
      sibuk = true;
      try {
        if (mode === 'buat') {
          if (!pertama) { pertama = isi; isi = ''; return gambar(); }
          if (isi !== pertama) { pertama = ''; isi = ''; return gambar('PIN tidak sama. Buat ulang.', true); }
          const garam = b64(crypto.getRandomValues(new Uint8Array(16)));
          ls.set(LS, { garam, hash: await hashPin(isi, garam), pj: PANJANG, gagal: 0, bio: K().bio || null });
          return (await Bio.ada()) && !K().bio ? tawarBio() : tutup(true);
        }
        const k = K();
        if (await hashPin(isi, k.garam) === k.hash) { k.gagal = 0; ls.set(LS, k); return tutup(true); }
        k.gagal = (k.gagal || 0) + 1; ls.set(LS, k); isi = '';
        if (k.gagal >= MAKS) { hapusData(); return tutup(false); }
        gambar('PIN salah. Sisa ' + (MAKS - k.gagal) + ' percobaan sebelum data CCare Plus di perangkat ini dihapus.', true);
      } finally { sibuk = false; }
    }
    async function pakaiBio() {
      if (sibuk) return; sibuk = true;
      const ok = await Bio.periksa(K().bio); sibuk = false;
      if (ok) { const k = K(); k.gagal = 0; ls.set(LS, k); tutup(true); } else gambar('Sidik jari tidak dikenali. Pakai PIN.', true);
    }
    function tawarBio() {
      el.innerHTML = `${logo}<h1 id="akJudul">Pakai sidik jari?</h1><p class="ak-ket">Buka AlvisyaLabs dengan sidik jari atau kunci layar perangkat. PIN tetap bisa dipakai.</p>
        <div class="ak-tombol"><button type="button" class="ak-tb utama" id="akBioYa">Aktifkan sidik jari</button><button type="button" class="ak-tb" id="akBioNanti">Nanti saja</button></div>`;
      document.getElementById('akBioNanti').onclick = () => tutup(true);
      document.getElementById('akBioYa').onclick = async (e) => { e.currentTarget.disabled = true; const id = await Bio.daftar(); if (id) { const k = K(); k.bio = id; ls.set(LS, k); } tutup(true); };
    }
    function tanyaLupa() {
      el.innerHTML = `${logo}<h1 id="akJudul">Lupa PIN?</h1><p class="ak-ket">Data CCare Plus di perangkat ini akan dihapus. Data di Sheet tetap aman; setelah itu sambungkan ulang CCare Plus lewat kode QR atau kode pasang, lalu buat PIN baru.</p>
        <div class="ak-tombol"><button type="button" class="ak-tb bahaya" id="akHapus">Hapus data di perangkat ini</button><button type="button" class="ak-tb" id="akBatal">Batal</button></div>`;
      document.getElementById('akBatal').onclick = () => gambar();
      document.getElementById('akHapus').onclick = () => { hapusData(); tutup(false); };
    }
    document.addEventListener('keydown', ketik, true);
    gambar();
    if (mode === 'buka' && K().bio) setTimeout(pakaiBio, 300);   // langsung tawarkan sidik jari
    return el.janji;
  }

  /** buka AlvisyaLabs: PIN pertama kali dibuat, berikutnya diminta; PIN lama 6 angka diganti 4 angka */
  async function bukaAplikasi() {
    if (terbuka()) return true;
    if (!adaPin()) return layar('buat');
    const ok = await layar('buka'); if (!ok) return layar('buat');   // data dihapus → buat PIN baru
    if ((K().pj || 6) !== PANJANG) return layar('buat');
    return true;
  }
  const keHalaman = () => { const ke = new URLSearchParams(location.search).get('ke'); if (ke && /^[\w\-./#=:%~+]+$/.test(ke) && !ke.startsWith('//') && !/^[a-z]+:/i.test(ke)) location.replace(new URL(ke.replace(/^\/+/, ''), AKAR).href); };
  // catat kapan aplikasi ditinggal; kembali setelah > 1 menit = terkunci lagi
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (ss.get(S_BUKA) === '1') ss.set(S_TINGGAL, String(Date.now())); return; }
    if (terbuka()) { ss.set(S_TINGGAL, null); return; }
    if (window.AlvisyaKunci.halamanMuka) bukaAplikasi(); else jaga();
  });
  function jaga() {   // halaman selain muka
    if (terbuka()) return true;
    const sini = location.href.slice(AKAR.length);
    location.replace(AKAR + '?ke=' + encodeURIComponent(sini));
    document.documentElement.style.visibility = 'hidden';   // jangan sempat menampilkan isi
    return false;
  }
  window.AlvisyaKunci = {
    halamanMuka: false, adaPin, terbuka, jaga, Bio,
    /** halaman muka memanggil ini sekali saat dibuka */
    async muka() { this.halamanMuka = true; const jalan = async () => { if (await bukaAplikasi()) keHalaman(); }; document.body ? jalan() : addEventListener('DOMContentLoaded', jalan); },
    async ubahPin() { if (await layar('buka')) return layar('buat'); return false; },
    async aturBio(nyala) { const k = K(); if (!nyala) { k.bio = null; ls.set(LS, k); return true; } const id = await Bio.daftar(); if (id) { k.bio = id; ls.set(LS, k); } return !!id; },
    bioAktif: () => !!K().bio,
  };
})();
