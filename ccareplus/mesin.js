/* Mesin hitung CCare Plus — aplikasi yang menghitung, Sheet hanya menyimpan data mentah untuk sinkron.
 * Rumus sama dengan Sheet "Jasa IPB Dashboard": Data Klinik → Catatan Harian (kehadiran, idx tarif, jasa, PPh) → dataDasbor (ringkas, grafik, rekap).
 * hitung(S, awalIso, kini) → objek berbentuk sama dengan jawaban API lama aksi=dasbor, jadi tampilan tidak berubah. */
(function (g) {
  const KUNCI = ['hadir', 'pagi', 'siang', 'igd', 'mcu', 'tele', 'total', 'kotor', 'pph', 'bersih', 'jHadir', 'jPagi', 'jSiang', 'jIgd', 'jMcu', 'jTele'];
  const iso = d => d.toISOString().slice(0, 10);
  const hariMinggu = t => new Date(t + 'T00:00:00Z').getUTCDay();   // 0 = Minggu
  function periodeDari(t, mulai) {
    let [y, m, d] = t.split('-').map(Number);
    if (d < mulai) { m--; if (m < 1) { m = 12; y--; } }
    return [iso(new Date(Date.UTC(y, m - 1, mulai))), iso(new Date(Date.UTC(y, m, mulai - 1)))];
  }
  function geserPeriode(awal, n, mulai) { const [y, m] = awal.split('-').map(Number); return periodeDari(iso(new Date(Date.UTC(y, m - 1 + n, mulai))), mulai); }
  /** tanggal & jam kini di Asia/Jakarta */
  function kiniJakarta(ms) { const d = new Date((ms == null ? Date.now() : ms) + 7 * 3600e3); return { t: iso(d), ms: ms == null ? Date.now() : ms }; }

  /** Catatan Harian: satu baris per baris Data Klinik, urut tanggal */
  function catatan(S) {
    const libur = new Set(S.libur.map(x => x.t)), tarif = S.tarif;   // urutan kolom Pengaturan, sama dengan INDEX(Tarif_*; MAX(1; COUNTIF(Tarif_Mulai; "<="&tanggal)))
    const jml = {}; S.hari.forEach(h => { jml[h.t] = (jml[h.t] || 0) + 1; });
    return S.hari.map((h, i) => [h, i]).sort((a, b) => a[0].t < b[0].t ? -1 : a[0].t > b[0].t ? 1 : a[1] - b[1]).map(([h]) => {
      const hadir = (h.pagi > 0) + (h.siang > 0) + (!h.pagi && !h.siang && h.igd + h.mcu > 0 ? 1 : 0);
      const minggu = hariMinggu(h.t) === 0, merah = libur.has(h.t);
      const ti = minggu || merah || !tarif.length ? null : tarif[Math.max(1, tarif.filter(x => x.mulai <= h.t).length) - 1];
      const r = { t: h.t, hadir, pagi: h.pagi, siang: h.siang, igd: h.igd, mcu: h.mcu, tele: h.tele, total: h.pagi + h.igd + h.siang + h.mcu + h.tele,
        jHadir: 0, jPagi: 0, jSiang: 0, jIgd: 0, jMcu: 0, jTele: 0, kotor: 0, pph: 0, bersih: 0 };
      if (ti) {
        r.jHadir = hadir * ti.hadir; r.jPagi = h.pagi * ti.pagi; r.jSiang = h.siang * ti.siang; r.jIgd = h.igd * ti.igd; r.jMcu = h.mcu * ti.mcu; r.jTele = h.tele * ti.tele;
        r.kotor = r.jHadir + r.jPagi + r.jSiang + r.jIgd + r.jMcu + r.jTele; r.pph = r.kotor * ti.pph; r.bersih = r.kotor - r.pph;
      }
      r.sumber = h.sumber + (jml[h.t] > 1 ? '  ·  ⚠ Ganda' : '') + (hadir > 0 && h.pagi + h.siang === 0 ? '  ·  ⚠ hanya pasien tindakan/MCU — cek kehadiran' : '')
        + (minggu || merah ? '  ·  ' + (minggu ? 'Minggu' : 'tanggal merah') + ': jasa tidak dihitung' : '');
      return r;
    });
  }

  /** jadwal aktif dari kotak Jadwal Shift (sama dengan rumus Jadwal Data) */
  function jadwalDari(slot) {
    const out = [];
    slot.forEach(s => s.kotak.forEach(k => {
      if (!k.kode || /^Digantikan/.test(k.kode)) return;
      const jenis = /^Event/.test(k.kode) ? 'Event' : /Pagi/i.test(k.kode) ? 'Pagi' : /Siang/i.test(k.kode) ? 'Siang' : k.kode;
      const jam = jenis === 'Pagi' ? (hariMinggu(s.t) === 5 ? '09' : '08') : jenis === 'Siang' ? '14' : '00';
      out.push({ t: s.t, kode: k.kode, ket: k.ket || '', mulai: Date.parse(s.t + 'T' + jam + ':00:00+07:00'), bayar: jenis === 'Event' ? (/Sudah/i.test(k.kode) ? 'Sudah dibayar' : 'Belum dibayar') : '' });
    }));
    return out;
  }

  function hitung(S, awalIso, msKini) {
    const mulai = S.mulai || 3, k = kiniJakarta(msKini), hariIni = k.t, kini = periodeDari(hariIni, mulai);
    const [awal, akhir] = awalIso ? periodeDari(awalIso, mulai) : kini;
    const baris = catatan(S);
    const dalam = (a, b) => baris.filter(x => x.t >= a && x.t <= b);
    const jumlah = L => L.reduce((s, x) => { KUNCI.forEach(q => s[q] += x[q]); return s; }, Object.fromEntries(KUNCI.map(q => [q, 0])));
    const tambahEvent = (j, a, b) => { const L = S.acara.filter(x => x.t >= a && x.t <= b); j.eventN = L.length; j.eventUang = L.reduce((t, x) => t + x.uang, 0); return j; };
    const ini = dalam(awal, akhir), lalu = geserPeriode(awal, -1, mulai);
    const s = tambahEvent(jumlah(ini), awal, akhir); s.hari = ini.length;
    const sLalu = tambahEvent(jumlah(dalam(lalu[0], lalu[1])), lalu[0], lalu[1]);
    const grafik = [];
    for (let i = -11; i <= 0; i++) { const [a, b] = geserPeriode(awal, i, mulai), j = jumlah(dalam(a, b)); grafik.push({ awal: a, bersih: j.bersih, total: j.total, terima: j.bersih + tambahEvent({}, a, b).eventUang }); }
    const thn = Number(awal.slice(0, 4)), bulanan = [];
    for (let m = 1; m <= 12; m++) {
      const [a, b] = periodeDari(thn + '-' + String(m).padStart(2, '0') + '-' + String(mulai).padStart(2, '0'), mulai), L = dalam(a, b);
      bulanan.push(Object.assign({ awal: a, akhir: b, hari: L.length }, tambahEvent(jumlah(L), a, b)));
    }
    const akumulasi = jumlah(baris.filter(x => x.t >= thn + '-01-01' && x.t <= hariIni && x.t.slice(0, 4) === String(thn))).bersih;
    const jadwal = jadwalDari(S.slot);
    const berikut = jadwal.filter(x => x.mulai > k.ms && !/^Digantikan|^Event/.test(x.kode)).sort((a, b) => a.mulai - b.mulai)[0] || null;
    return {
      ok: true, nama: S.nama, tempat: S.tempat, mulai, hariIni, periode: { awal, akhir, berjalan: awal === kini[0], lalu: lalu[0] },
      ringkas: s, lalu: sLalu, akumulasi, tahun: thn,
      harian: ini.map(x => ({ t: x.t, hadir: x.hadir, pagi: x.pagi, siang: x.siang, igd: x.igd, mcu: x.mcu, tele: x.tele, total: x.total, kotor: x.kotor, pph: x.pph, bersih: x.bersih, sumber: x.sumber })),
      grafik, bulanan, jadwal: jadwal.filter(x => x.t >= awal && x.t <= akhir).map(x => ({ t: x.t, kode: x.kode, ket: x.ket, bayar: x.bayar })),
      berikut: berikut ? { t: berikut.t, kode: berikut.kode, mulai: berikut.mulai } : null,
      pasien: null, tarif: S.tarif, libur: S.libur.filter(x => x.t.slice(0, 4) === String(thn)),
      url: S.url, gid: S.gid, slot: S.slot.filter(x => x.t >= awal && x.t <= akhir).map(x => ({ t: x.t, kotak: x.kotak.map(q => ({ ke: q.ke, kode: q.kode, ket: q.ket })) })),
      permintaan: S.permintaan, kodeJadwal: S.kodeJadwal, mintaScan: S.mintaScan, bagi: S.bagi,
    };
  }
  /** daftar pasien periode (data dari Rekap Pasien yang sudah tersinkron) */
  function pasien(S, awalIso, msKini) {
    const mulai = S.mulai || 3, [awal, akhir] = periodeDari(awalIso || kiniJakarta(msKini).t, mulai);
    return { ok: true, awal, pasien: S.pasien.filter(p => p.t >= awal && p.t <= akhir) };
  }
  g.Mesin = { hitung, pasien, catatan, periodeDari, jadwalDari };
})(typeof window !== 'undefined' ? window : globalThis);
