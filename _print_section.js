    }

    // Hitung nilai rapor mapel dari record nilai_mapel (bobot + UH rata2)
    function _calcNilaiRaporFromMapel(sc, bobot){
        const b = bobot || {kehadiran:10, tugas:20, uh:40, pas_pat:30};
        const kehadiran = Number(sc.kehadiran||0);
        const tugas = Number(sc.tugas||0);
        const uhVals = [sc.uh1,sc.uh2,sc.uh3,sc.uh4,sc.uh5].map(x=>Number(x||0)).filter(x=>x>0);
        const uh = uhVals.length ? (uhVals.reduce((a,c)=>a+c,0)/uhVals.length) : 0;
        const pas = Number(sc.pas_pat||sc.pas||0);
        const n = (kehadiran*(b.kehadiran/100)) + (tugas*(b.tugas/100)) + (uh*(b.uh/100)) + (pas*(b.pas_pat/100));
        return Math.round(n*100)/100;
    }

    function printRaporSantri(nis, kelas, opts){
        try{
            const s = students.find(x => String(x.nis) === String(nis));
            if(!s){ showToast('Santri tidak ditemukan', 'error'); return; }
            const { tahun_ajar, semester } = getActivePeriode();

            // Ambil daftar mapel dari template (sesuai format rapor Canva yang disepakati)
            // Catatan: tidak menambahkan mapel extra di luar daftar template.
            const mapels = [..._raporTemplate.lisan, ..._raporTemplate.tulis].map(_normMapel);

            // Display helper: ubah uppercase jadi Title Case (biar enak dibaca di kolom Latin)
            const _toTitleCase = (str)=>{
                const s = String(str||'').trim();
                if(!s) return '';
                return s
                    .toLowerCase()
                    .split(/\s+/)
                    .map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1)) : w)
                    .join(' ');
            };

            // bobot dari memori/config (fallback default)
            const b = (window.bobotNilai && typeof window.bobotNilai === 'object') ? window.bobotNilai : {kehadiran:10, tugas:20, uh:40, pas_pat:30};

            // helper ambil nilai mapel untuk santri
            const getNilai = (mapel) => {
                const rec = scores.find(x => String(x.nis)===String(nis) && _normMapel(x.mapel)===_normMapel(mapel) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                const v = _calcNilaiRaporFromMapel(rec, b);
                return v ? v : 0;
            };

            // rata-rata kelas per mapel
            const avgKelas = (mapel) => {
                const vals = students.filter(st=>st.kelas===kelas).map(st => {
                    const rec = scores.find(x => String(x.nis)===String(st.nis) && _normMapel(x.mapel)===_normMapel(mapel) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                    return _calcNilaiRaporFromMapel(rec, b);
                }).filter(v=>Number(v)>0);
                if(!vals.length) return 0;
                return Math.round((vals.reduce((a,c)=>a+c,0)/vals.length)*100)/100;
            };

            const makeRow = (m, no, group)=>{
                const nm = _normMapel(m);
                const nilai = getNilai(m);
                const rata = avgKelas(m);
                return {
                    no,
                    mapel_id: _toTitleCase(m),
                    mapel_ar: _mapelAr[nm] || '',
                    nilai: nilai,
                    nilai_ar: nilai ? _numToArabicWords(nilai) : '-',
                    rata: rata || '-',
                    group
                };
            };

            const lisan = _raporTemplate.lisan.map((m,i)=>makeRow(m, i+1, 'LISAN'));
            const tulis = _raporTemplate.tulis.map((m,i)=>makeRow(m, i+1, 'TULIS'));
            const rows = [...lisan, ...tulis];

            const nilaiList = rows.map(r=>Number(r.nilai)||0).filter(v=>v>0);
            const jumlah = Math.round((nilaiList.reduce((a,c)=>a+c,0))*100)/100;
            const rata2 = nilaiList.length ? Math.round((jumlah/nilaiList.length)*100)/100 : 0;

            // ranking kelas berdasarkan rata2 mapel
            const rankArr = students.filter(st=>st.kelas===kelas).map(st => {
                const vals = mapels.map(m => {
                    const rec = scores.find(x => String(x.nis)===String(st.nis) && _normMapel(x.mapel)===_normMapel(m) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                    return _calcNilaiRaporFromMapel(rec, b);
                }).filter(v=>Number(v)>0);
                const sum = vals.reduce((a,c)=>a+c,0);
                const avg = vals.length ? (sum/vals.length) : 0;
                return { nis: st.nis, avg };
            }).sort((a,b)=>b.avg-a.avg);
            const ranking = Math.max(1, rankArr.findIndex(r=>String(r.nis)===String(nis))+1);

            const totalKelas = students.filter(st=>st.kelas===kelas).length || 0;

            const years = String(tahun_ajar||'').match(/\d{4}/g) || [];
            const y1 = years[0] || '';
            const y2 = years[1] || '';
            const tahunAr = (y1 && y2) ? `${_toArabicIndic(y1)} / ${_toArabicIndic(y2)}` : _toArabicIndic(tahun_ajar);

            const jenjang = _inferJenjangFromKelas(kelas);
            const _pKelas = (typeof _parseKelasParts==='function') ? _parseKelasParts(kelas) : { paralel:'', kelas:kelas };
            const paralelAr = (_pKelas.paralel && String(_pKelas.paralel).trim()!=='') ? String(_pKelas.paralel).trim() : '-';

            // Transliteration sederhana (fallback): Latin -> Arab agar nama tetap berhuruf Arab
            // Catatan: ini transliterasi praktis, bukan kaidah ilmiah 100%.
            const _latinToArabicName = (input)=>{
                let t = String(input||'').trim();
                if(!t) return '';
                const lower = t.toLowerCase();
                // proses per-kata, jaga spasi
                const mapPairs = {
                    'kh':'خ', 'sy':'ش', 'sh':'ش', 'dz':'ذ', 'ts':'ث', 'th':'ث',
                    'dh':'ض', 'gh':'غ', 'ng':'نغ', 'ny':'ني'
                };
                const mapChar = {
                    'a':'ا','b':'ب','c':'تش','d':'د','e':'ي','f':'ف','g':'غ','h':'ه','i':'ي',
                    'j':'ج','k':'ك','l':'ل','m':'م','n':'ن','o':'و','p':'ف','q':'ق','r':'ر',
                    's':'س','t':'ت','u':'و','v':'ف','w':'و','x':'كس','y':'ي','z':'ز'
                };
                const words = lower.split(/(\s+)/);
                const out = words.map(w=>{
                    if(/^\s+$/.test(w)) return w;
                    let s = w;
                    let res = '';
                    for(let i=0;i<s.length;){
                        const pair = s.slice(i,i+2);
                        if(mapPairs[pair]){ res += mapPairs[pair]; i += 2; continue; }
                        const ch = s[i];
                        if(/[a-z]/.test(ch)) res += (mapChar[ch]||ch);
                        else if(/[0-9]/.test(ch)) res += _toArabicIndic(ch);
                        else if(ch==='-'||ch==='\''||ch==='’') { /* skip */ }
                        else res += ch;
                        i += 1;
                    }
                    return res;
                }).join('');
                return out.replace(/\s{2,}/g,' ').trim();
            };

            // Nama Arab diambil dari DB (kolom santri.nama_arab). Jika kosong, fallback ke nama latin (tetap tampil).
            const _latinName = (s.nama && String(s.nama).trim()!=='')
              ? String(s.nama).trim()
              : (s.name && String(s.name).trim()!=='')
                ? String(s.name).trim()
                : '';

            const namaArab = (s.nama_arab && String(s.nama_arab).trim()!=='')
              ? String(s.nama_arab).trim()
              : (s.name_arab && String(s.name_arab).trim()!=='')
                ? String(s.name_arab).trim()
                : (_latinName ? (_latinToArabicName(_latinName) || _latinName) : '-');

            const nisArab = (s.nis!=null && String(s.nis).trim()!=='') ? _toArabicIndic(String(s.nis)) : '-';

            const jumlahAr = jumlah ? _toArabicIndic(String(jumlah)) : '-';
            const rata2Ar = rata2 ? _toArabicIndic(String(rata2)) : '-';
            const rankingAr = ranking ? _toArabicIndic(String(ranking)) : '-';
            const totalAr = totalKelas ? _toArabicIndic(String(totalKelas)) : '-';
            const rankingTextAr = `${rankingAr} من ${totalAr} طالب/طالبة`;

            // ========= TTQ (Tahsin & Tahfidz) =========
            const _findNilaiByKeywords = (keywords, targetNis)=>{
                const kw = (keywords||[]).map(x=>_normMapel(x));
                const recs = (scores||[]).filter(x => String(x.nis)===String(targetNis)
                    && String(x.tahun_ajar)===String(tahun_ajar)
                    && Number(x.semester)===Number(semester)
                    && kw.some(k => _normMapel(x.mapel).includes(k))
                );
                if(!recs.length) return { nilai:0, rata:0 };
                const vals = recs.map(r=>_calcNilaiRaporFromMapel(r, b)).filter(v=>Number(v)>0);
                const nilai = vals.length ? Math.max(...vals) : 0;

                const avgVals = students.filter(st=>st.kelas===kelas).map(st=>{
                    const rs = (scores||[]).filter(x => String(x.nis)===String(st.nis)
                        && String(x.tahun_ajar)===String(tahun_ajar)
                        && Number(x.semester)===Number(semester)
                        && kw.some(k => _normMapel(x.mapel).includes(k))
                    );
                    if(!rs.length) return 0;
                    const vs = rs.map(r=>_calcNilaiRaporFromMapel(r, b)).filter(v=>Number(v)>0);
                    return vs.length ? Math.max(...vs) : 0;
                }).filter(v=>Number(v)>0);

                const rata = avgVals.length ? Math.round((avgVals.reduce((a,c)=>a+c,0)/avgVals.length)*100)/100 : 0;
                return { nilai, rata };
            };

            const ttqItems = [
                { grp:'TAHSIN', no:1, id:'Kelancaran membaca', ar:'طلاقة التلاوة', kw:['TAHSIN','KELANCARAN','BACA','TILAWAH'] },
                { grp:'TAHSIN', no:2, id:'Tajwid', ar:'التجويد', kw:['TAHSIN','TAJWID','TAJWEED'] },
                { grp:'TAHFIDZ', no:1, id:'Hafalan Wajib', ar:'الحفظ المقرر', kw:['TAHFIDZ','HAFALAN','WAJIB'] },
                { grp:'TAHFIDZ', no:2, id:'Hafalan Muroja\'ah', ar:'مراجعة الحفظ', kw:['TAHFIDZ','MUROJA','MURAJA','MURAJAAH','MURAJAH'] },
                { grp:'TAHFIDZ', no:3, id:'Hafalan Tambahan', ar:'الحفظ الإضافي', kw:['TAHFIDZ','TAMBAHAN','IDHAFI','TAMBAH'] },
                { grp:'TAHFIDZ', no:4, id:'Tajwid', ar:'التجويد', kw:['TAHFIDZ','TAJWID','TAJWEED'] },
                { grp:'TAHFIDZ', no:5, id:'Ujian Tulis', ar:'الامتحان التحريري', kw:['TAHFIDZ','UJIAN','TULIS'] }
            ];

            const ttqRows = ttqItems.map(it=>{
                const r = _findNilaiByKeywords(it.kw, nis);
                return {
                    grp: it.grp,
                    no: it.no,
                    mapel_id: it.id,
                    mapel_ar: it.ar,
                    nilai: r.nilai,
                    nilai_ar: r.nilai ? _numToArabicWords(r.nilai) : '-',
                    rata: r.rata || '-'
                };
            });

            const ttqTahsin = ttqRows.filter(x=>x.grp==='TAHSIN');
            const ttqTahfidz = ttqRows.filter(x=>x.grp==='TAHFIDZ');

            // ========= Absensi & Sikap =========
            const scWali = (waliScores || []).find(x => String(x.nis)===String(nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
            const hadirS = Number(scWali.hadir_s || 0) || 0;
            const hadirI = Number(scWali.hadir_i || 0) || 0;
            const hadirA = Number(scWali.hadir_a || 0) || 0;
            const hadirSAr = _toArabicIndic(String(hadirS));
            const hadirIAr = _toArabicIndic(String(hadirI));
            const hadirAAr = _toArabicIndic(String(hadirA));

            const _sikapToArab = (v)=>{
                const x = String(v||'').trim().toUpperCase();
                if(x==='A') return 'ممتاز';
                if(x==='B') return 'جيد جدا';
                if(x==='C') return 'جيد';
                if(x==='D') return 'مقبول';
                // kalau sudah Arabic / teks lain
                return (String(v||'').trim()!=='' ? String(v).trim() : '-');
            };
            const sikapAkhlak = _sikapToArab(scWali.akhlak);
            const sikapRajin = _sikapToArab(scWali.kerajinan);
            const sikapBersih = _sikapToArab(scWali.kebersihan);
            const sikapDisiplin = _sikapToArab(scWali.kedisiplinan);

            // ========= CSS (print rapor bilingual mengikuti desain PDF/Canva) =========
            const css = `
                @page { size: A4; margin: 13mm; }
                body{ line-height:1.0; font-family: Arial, sans-serif; color:#000; padding:0; margin:0;  font-size:15px; }
                .arab{ font-family: Arial, sans-serif; }
	                .latin{ font-family:"Times New Roman", Times, serif; direction:ltr;}
                .wrap{ width:100%; direction:rtl; }
                /* kontrol bahasa untuk blok identitas */
                .info-ar{ display:block; }
                .info-id{ display:none; }
                .wrap.rapor-lang-id .info-ar{ display:none; }
                .wrap.rapor-lang-id .info-id{ display:block; }

                /* rtl tapi tetap nempel kiri (sesuai request) */
                .rtl-left{ direction:rtl; text-align:left; }
                .page{ page-break-after: always; position:relative; }
                .page:last-child{ page-break-after: auto; }
                /* ruang atas supaya logo tidak kepotong + jadikan layout kolom agar nomor halaman bisa nempel bawah */
                .page-inner{ padding-top: 0mm; display:flex; flex-direction:column; min-height: 270mm; position:relative; padding-bottom: 16mm; }

                /* rapetin jarak antar elemen */
                .page-inner div{ margin:0; }

                /* nomor halaman selalu di paling bawah, centered */
                .page-no{ position:absolute; left:0; right:0; bottom:10mm; display:flex; justify-content:center; padding-top:0; margin-top:0; }
                .page-no span{ display:inline-flex; width:22px; height:22px; border:2px solid #000; border-radius:999px; align-items:center; justify-content:center; font-weight:800; font-size:14px; }

                /* header */
                /* kurangi overlap kop -> identitas (logo sebelumnya "nabrak" identitas) */
                .head{ text-align:center; margin-top:0mm; margin-bottom:7mm; padding-top:0mm; }
                /* grid harus LTR biar logo benar-benar di kanan (wrapper RTL bikin grid kebalik) */
                .kop-grid{ display:grid; grid-template-columns: 100px 1fr 100px; align-items:center; gap:10px; direction:ltr; }
                .kop-spacer{ width:100px; }
                .kop-text{ direction:rtl; text-align:center; }
                .kop-logo{ justify-self:end; align-self:center; display:flex; justify-content:flex-end; align-items:center; }
                /* logo diset agar sejajar tinggi 3 baris kop */
                /* tinggi logo dibuat sejajar dengan tinggi 3 baris kop */
                .kop-logo img{ height:95px; width:auto; display:block; margin-top:0; }
                /* kop: padding diperbesar agar identitas tidak tertimpa logo */
                /* padding antar 3 baris kop dipertegas supaya sejajar dan aman untuk logo */
                .inst{ font-size:29px; font-weight:900;  padding:5px 0; margin:0;  line-height:1.15; }
                .addr{ font-size:17px; font-weight:700; line-height:1.15; padding:5px 0; margin:0; }
                .year{ font-size:17px; font-weight:900; line-height:1.15; padding:5px 0; margin:0; }

                /* student info (tanpa tabel) */
                .info-block{ margin-top:3mm; direction:rtl; font-size:16px; text-align:left; width: calc(100% - 2mm); margin-right:2mm; box-sizing:border-box; }
                .info-row{ display:flex; justify-content:space-between; gap:14px; }
                /* identitas model Canva: 2 kolom (kiri=kelas/semester, kanan=nama/nis). Paralel dihapus. */
                .info-row.ident2{ display:grid; grid-template-columns: 50% 50%; gap:10px; direction:ltr; justify-items:stretch; }
                .info-row.ident2 .ident-col{ direction:rtl; text-align:left; display:flex; gap:8px; align-items:baseline; justify-content:flex-end; }
                /* kolom kanan (nama/nis) digeser sedikit ke kiri supaya tidak kepotong di tepi kanan saat print */
                .info-row.ident2 .ident-col:nth-child(2){ justify-content:flex-start; text-align:right; justify-self:end; padding-right:7mm; box-sizing:border-box; }
                .info-row.ident2 .ident-col:nth-child(2) .val{ max-width:100%; overflow-wrap:anywhere; }
                .info-row.ident2 .ident-col .lbl{ font-weight:900; white-space:nowrap; }
                .info-row.ident2 .ident-col .val{ font-weight:800; }
                .info-row.three{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; direction:ltr; }
                .info-row.three .info-item{ direction:rtl; }
                .info-row.three .info-item.left{ justify-self:start; }
                .info-row.three .info-item.mid{ justify-self:center; }
                .info-row.three .info-item.right{ justify-self:end; }
                .info-row + .info-row{ margin-top:1.2mm; }
                .info-item{ display:flex; gap:8px; align-items:baseline; }
                .info-item .lbl{ font-weight:900; white-space:nowrap; }
                .info-item .val{ font-weight:800; }
                .info-row.single{ justify-content:flex-start; }

                /* info layout (dual columns) mengikuti Canva */
                .info-row.dual{ display:flex; justify-content:space-between; gap:14px; direction:ltr; }
                .info-col{ width:48%; }
                .info-col.right{ direction:rtl; text-align:right; }
                .info-col.left{ direction:rtl; text-align:left; }
                .info-line{ display:flex; gap:8px; align-items:baseline; }
                .info-line .lbl{ font-weight:900; white-space:nowrap; }
                .info-line .val{ font-weight:800; }
                .info-leftline{ display:flex; gap:10px; align-items:baseline; justify-content:flex-start; }

                /* pilihan bahasa identitas: default ikut Canva (Arab/bilingual). Mode Indonesia bisa diaktifkan via window.RAPOR_LANG='id' */
                .info-id{ display:none; }
                .rapor-lang-id .info-ar{ display:none; }
                .rapor-lang-id .info-id{ display:block; }

                /* Arab: tetap RTL, tapi rata kiri sesuai request user */
                .rapor-lang-ar .info-col.left,
                .rapor-lang-bi .info-col.left{ direction:rtl; text-align:left; }
                .rapor-lang-ar .info-leftline,
                .rapor-lang-bi .info-leftline{ justify-content:flex-start; }


                /* tables */
                table.tbl{ width: calc(100% - 2mm); margin-right:2mm; border-collapse:collapse; table-layout:fixed; direction:rtl; }
                table.tbl th, table.tbl td{ border:2px solid #000; padding:4px 4px; font-size:16px; line-height:1.0; vertical-align:middle; }
                table.tbl th{ font-weight:900; }
                .c{ text-align:center; }
                .r{ text-align:right; }
                .l{ text-align:left; }
                .num{ font-weight:900; }
                .words{ font-weight:900; font-size:16px; line-height:1.0; }
                .subject-ar{ font-weight:900; font-size:20px; line-height:1.0; }
	                .subject-id{ font-size:13px; }
	                /* Latin font sizing: one more step smaller (-1px) */
	                table.tbl th.latin, table.tbl td.latin{ font-size:15px; }
	                table.tbl th.latin.subject-id, table.tbl td.latin.subject-id{ font-size:12px; }
	                table.box th.latin, table.box td.latin{ font-size:17px; }
	                .info-block.latin{ font-size:15px; }
                .group-row td{ font-weight:900; font-size:18px; text-align:center; padding:4px 4px; line-height:1.0; }
                .sum-row td{ font-weight:900; font-size:16px; line-height:1.0; }

                table.tbl.legend{ margin-top:2mm; margin-bottom:1mm; }
                /* tampilkan garis atas (top border) untuk tabel ujian lisan/tulis seperti template Canva */
                table.tbl.body{ margin-top:0; margin-bottom:2mm; border:2px solid #000;  font-size:12px; }
                table.tbl.summary{ margin-top:0; }

                /* jarak title <-> tabel atas dan title <-> tabel bawah disamakan */
                .exam-title{ display:flex; justify-content:center; align-items:baseline; gap:12px; margin:2mm 0 2mm; }
                /* samakan ukuran judul ujian dengan ukuran "mata pelajaran" (header tabel) */
	                .exam-title .latin{ font-size:14px; font-style:normal; font-weight:900; }
                .exam-title .arab{ font-size:16px; font-weight:900; }

                .ttq-title{ display:flex; justify-content:center; align-items:baseline; gap:12px; margin:0 0 4mm; text-align:center; }
                /* samakan ukuran judul TTQ dengan judul ujian / "mata pelajaran" */
                /* TTQ title: tidak italic, cukup bold */
	                .ttq-title .latin{ font-size:14px; font-style:normal; font-weight:900; }
                .ttq-title .arab{ font-size:16px; font-weight:900; }

                /* boxes */
                .grid2{ display:grid; grid-template-columns: 1fr 1fr; gap:10mm; margin-top:5mm; }
                table.box{ border-collapse:collapse; width:100%; direction:rtl; }
                table.box th, table.box td{ border:2px solid #000; padding:4px 4px; font-size:18px; line-height:1.0; vertical-align:middle; }
                table.box th{ font-weight:900; }
                table.box thead th{ font-size:16px; }
                .box-label{ font-size:14px; font-weight:900; }

                /* signatures */
                /* titimangsa rapor: beri jarak/padding agar tidak mepet */
                .sig-spacer-2{ height:2em; }
                .sig-date-line{ display:block; }
                .sig-date{ text-align:right; font-size: 16px; font-weight:900; margin-top:14mm; margin-bottom:12mm; padding:5px 2mm; }
                .sig-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; column-gap:12mm; align-items:flex-start; margin-top:6mm; padding-bottom:2mm; justify-items:stretch; }
                .sig-col{ text-align:center; display:flex; flex-direction:column; align-items:center; }
                .sig-title{ font-weight:900; font-size: 16px; line-height:1.15; height:18mm; min-height:18mm; display:flex; flex-direction:column; justify-content:center;  width:100%; }
                .sig-title .arab{ display:block; order:0; }
	                .sig-title .latin{ display:block; order:1; font-weight:700; font-size:14px; direction:ltr; }
                /* ruang tanda tangan: 4 baris kosong */
                .sig-gap{ height:22mm; }
                /* cukup 1 garis (tanpa titik-titik ganda) */
                .sig-line{ border-top:2px solid #000; width:80%; margin:0 auto; }
                
                .topline{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6mm; }
                .topline .stu{ font-size:22px; font-weight:900; }
                .topline .pno{ font-size:22px; font-weight:900; }

                /* GLOBAL: semua teks 12px (arabic & latin), kecuali kop */
                .wrap *{ font-size:15px !important; }
                .inst{ font-size:29px !important; }
                .addr{ font-size:17px !important; }
                .year{ font-size:17px !important; }

            `;

            // ========= Builders =========
            const _rowHTML = (r)=>{
                const no = _toArabicIndic(r.no);
                const angka = r.nilai ? _toArabicIndic(String(r.nilai)) : '-';
                const terbilang = r.nilai ? r.nilai_ar : '-';
                const rataAr = (r.rata && r.rata !== '-') ? _toArabicIndic(String(r.rata)) : '-';
                const subj = (r.mapel_ar && String(r.mapel_ar).trim()!=='') ? r.mapel_ar : '—';
                return `
                    <tr>
                        <td class="arab c num">${no}</td>
                        <td class="arab r subject-ar">${subj}</td>
                        <td class="arab c num">${rataAr}</td>
                        <td class="arab c num">${angka}</td>
                        <td class="arab r words">${terbilang}</td>
                    </tr>
                `;
            };

            // Format tabel mengikuti desain Canva (bilingual + 6 kolom: رقم | عربي | Latin | معدل | رقما | كتابة)
            const makeLegendHeader = (subjectTitleAr='المواد الدراسية')=>{
                return `
                    <table class="tbl legend">
                        <colgroup>
                            <col style="width:7%">   <!-- الرقم -->
                            <col style="width:21%">  <!-- mapel ar -->
                            <col style="width:27%">  <!-- mapel id -->
                            <col style="width:13%">  <!-- rata -->
                            <col style="width:9%">  <!-- angka -->
                            <col style="width:17%">  <!-- terbilang -->
                        </colgroup>
                        <thead>
                            <tr>
                                <th rowspan="2" class="arab c">الرقم</th>
                                <th colspan="2" class="arab c">${subjectTitleAr}</th>
                                <th class="arab c">معدل الصف</th>
                                <th colspan="2" class="arab c">الدرجة المكتسبة</th>
                            </tr>
                            <tr>
                                <th colspan="2" class="c latin">Mata Pelajaran</th>
                                <th class="c latin">Rata - rata<br/>Kelas</th>
                                <th class="arab c">رقما</th>
                                <th class="arab c">كتابة</th>
                            </tr>
                        </thead>
                    </table>
                `;
            };

            const _rowHTML6 = (r)=>{
                const no = _toArabicIndic(r.no);
                const angka = r.nilai ? _toArabicIndic(String(r.nilai)) : '';
                const terbilang = r.nilai ? r.nilai_ar : '';
                const rataAr = (r.rata && r.rata !== '-') ? _toArabicIndic(String(r.rata)) : '';
                const id = (r.mapel_id || '').trim();
                const ar = (r.mapel_ar || '').trim();
                return `
                    <tr>
                        <td class="arab c num">${no}</td>
                        <td class="arab r subject-ar">${ar || ''}</td>
                        <td class="latin l subject-id">${escapeHtml(id)}</td>
                        <td class="latin c num">${rataAr}</td>
                        <td class="arab c num">${angka}</td>
                        <td class="arab r words">${terbilang}</td>
                    </tr>
                `;
            };

            const makeExamTable = (arr)=>{
                return `
                    <table class="tbl body">
                        <colgroup>
                            <col style="width:7%">   <!-- الرقم -->
                            <col style="width:21%">  <!-- mapel ar -->
                            <col style="width:27%">  <!-- mapel id -->
                            <col style="width:13%">  <!-- rata -->
                            <col style="width:9%">  <!-- angka -->
                            <col style="width:17%">  <!-- terbilang -->
                        </colgroup>
                        <tbody>
                            ${arr.map(_rowHTML6).join('')}
                        </tbody>
                    </table>
                `;
            };

            const makeSummaryRows = ()=>{
                const rataWords = rata2 ? _numToArabicWords(rata2) : '';
                return `
                    <table class="tbl body summary">
                        <colgroup>
                            <col style="width:7%">
                            <col style="width:21%">
                            <col style="width:27%">
                            <col style="width:13%">
                            <col style="width:9%">
                            <col style="width:17%">
                        </colgroup>
                        <tbody>
                            <tr class="sum-row">
                                <td></td>
                                <td class="arab r subject-ar">مجموع الدرجات</td>
                                <td class="latin l subject-id">Jumlah</td>
                                <td></td>
                                <td class="arab c num">${jumlahAr}</td>
                                <td></td>
                            </tr>
                            <tr class="sum-row">
                                <td></td>
                                <td class="arab r subject-ar">المعدل التراكمي</td>
                                <td class="latin l subject-id">Rata-rata</td>
                                <td></td>
                                <td class="arab c num">${rata2Ar}</td>
                                <td class="arab r words" style="font-weight:800;">${rataWords}</td>
                            </tr>
                            <tr class="sum-row">
                                <td></td>
                                <td class="arab r subject-ar">الترتيب</td>
                                <td class="latin l subject-id">Rangking</td>
                                <td class="arab c" colspan="3" style="font-weight:900;">${rankingAr} من ${totalAr} طالب/طالبة</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            };

            const makeMainTable = ()=>{
                return `
                    ${makeLegendHeader()}

                    <div class="exam-title">
                        <span class="latin">Ujian Lisan</span>
                        <span class="arab">الامتحان الشفوي</span>
                    </div>
                    ${makeExamTable(lisan)}

                    <div class="exam-title">
                        <span class="latin">Ujian Tulis</span>
                        <span class="arab">الامتحان التحريري</span>
                    </div>
                    ${makeExamTable(tulis)}

                    ${makeSummaryRows()}
                `;
            };

            const makeTTQTable = ()=>{
                const rowTTQ = (r)=>{
                    const no = _toArabicIndic(r.no);
                    const angka = r.nilai ? _toArabicIndic(String(r.nilai)) : '';
                    const terbilang = r.nilai ? r.nilai_ar : '';
                    const rataAr = (r.rata && r.rata !== '-') ? _toArabicIndic(String(r.rata)) : '';
                    const id = (r.mapel_id || '').trim();
                    const ar = (r.mapel_ar || '').trim();
                    return `
                        <tr>
                            <td class="arab c num">${no}</td>
                            <td class="arab r subject-ar">${ar}</td>
                            <td class="latin l subject-id">${escapeHtml(id)}</td>
                            <td class="latin c num">${rataAr}</td>
                            <td class="arab c num">${angka}</td>
                            <td class="arab r words">${terbilang}</td>
                        </tr>
                    `;
                };

                return `
                    ${makeLegendHeader('المواد الدراسية الرئيسية')}

                    <table class="tbl body ttq">
                        <colgroup>
                            <col style="width:7%">
                            <col style="width:21%">
                            <col style="width:27%">
                            <col style="width:13%">
                            <col style="width:9%">
                            <col style="width:17%">
                        </colgroup>
                        <tbody>
                            <tr class="group-row">
                                <td class="arab c num">أ -</td>
                                <td colspan="5" class="c">
                                    <span class="latin">Tahsin</span>
                                    &nbsp;&nbsp;
                                    <span class="arab">التحسين</span>
                                </td>
                            </tr>
                            ${ttqTahsin.map(rowTTQ).join('')}

                            <tr class="group-row">
                                <td class="arab c num">ب -</td>
                                <td colspan="5" class="c">
                                    <span class="latin">Tahfidz</span>
                                    &nbsp;&nbsp;
                                    <span class="arab">التحفيظ</span>
                                </td>
                            </tr>
                            ${ttqTahfidz.map(rowTTQ).join('')}
                        </tbody>
                    </table>
                `;
            };

            const namaLabel = (String(s.jk||'').toUpperCase()==='P') ? 'اسم الطالبة' : 'اسم الطالب';
            const jurusanArab = _jurusanToArab(kelas);
            const _formatParalelToken = (p)=>{
                const s = String(p||'').trim();
                if(!s || s==='-') return '-';
                // contoh: A3 -> ٣A (digit arabic-indic dulu, lalu huruf)
                const m = s.match(/^([A-Za-z]+)(\d+)$/);
                if(m){
                    const letters = String(m[1]||'').toUpperCase();
                    const digits = String(m[2]||'');
                    return `${_toArabicIndic(digits)}${letters}`;
                }
                // format lain: hanya konversi digit
                return _toArabicIndic(s);
            };

            const paralelToken = _formatParalelToken(paralelAr);

            // Mode bahasa untuk identitas (default: bilingual ala Canva)
            // Bisa diubah dari console / inline: window.RAPOR_LANG = 'id' | 'ar' | 'bi'
            const _langRaw = String(window.RAPOR_LANG || window.raporLang || window.rapor_lang || 'bi').toLowerCase();
            const raporLang = (_langRaw.startsWith('id') || _langRaw.includes('indo')) ? 'id' : (_langRaw.startsWith('ar') || _langRaw.includes('arab')) ? 'ar' : 'bi';

            const kelasJurusanID = (()=>{
                // request: paralel (mis. A3) dihapus dari identitas
                const p = _pKelas || { jenjang:'', jurusan:'', paralel:'' };
                const a = [p.jenjang, p.jurusan].filter(Boolean).join(' ').trim();
                return a ? a : String(kelas||'');
            })();
            const semesterID = (Number(semester)===1) ? 'Awal' : (Number(semester)===2) ? 'Akhir' : String(semester||'');

            const html = `
                <div class="wrap rapor-lang-${raporLang}">

                    <!-- PAGE 1 -->
                    <div class="page">
                        <div class="page-inner">
                            <div class="head">
                                <div class="kop-grid">
                                    <div class="kop-spacer"></div>
                                    <div class="kop-text">
                                        <div class="arab inst">معهد حسن الخاتمة الإسلامي</div>
                                        <div class="arab addr">مانيسكيدول - جالكسنا - كونينغان - جاوا الغربية</div>
                                        <div class="arab year">السنة الدراسية : ${tahunAr}</div>
                                    </div>
                                    <div class="kop-logo"><img src="logo.png" /></div>
                                </div>
                            </div>

                            <!-- IDENTITAS (Arab/bilingual ala Canva): RTL tapi rata kiri. Paralel dihapus. -->
                            <div class="info-block arab info-ar">
                                <div class="info-row ident2">
                                    <div class="ident-col" style="text-align:left;">
                                        <span class="lbl" style="font-weight:900;">المستوى / القسم:</span>
                                        <span class="val" style="font-weight:800;">${_jenjangToArab(jenjang)} ${escapeHtml(jurusanArab)}</span>
                                    </div>
                                    <div class="ident-col">
                                        <span class="lbl" style="font-weight:900;">${namaLabel} :</span>
                                        <span class="val" style="font-weight:800;">${namaArab}</span>
                                    </div>
                                </div>
                                <div class="info-row ident2" style="margin-top:1.2mm;">
                                    <div class="ident-col" style="text-align:left;">
                                        <span class="lbl" style="font-weight:900;">الفصل الدراسي :</span>
                                        <span class="val" style="font-weight:800;">${_semesterToArab(semester)}</span>
                                    </div>
                                    <div class="ident-col">
                                        <span class="lbl" style="font-weight:900;">رقم القيد :</span>
                                        <span class="val num" style="font-weight:800;">${nisArab}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- IDENTITAS (Indonesia) : kiri ke kanan, rata kiri -->
                            <div class="info-block latin info-id" style="direction:ltr; text-align:left;">
                                <div class="info-row" style="justify-content:flex-start; gap:18px; text-align:left;">
                                    <div class="info-item"><span class="lbl">Kelas/Jurusan:</span><span class="val">${escapeHtml(kelasJurusanID)}</span></div>
                                    <div class="info-item"><span class="lbl">Semester:</span><span class="val">${escapeHtml(semesterID)}</span></div>
                                </div>
                                <div class="info-row" style="justify-content:flex-start; gap:18px; margin-top:1.2mm;">
                                    <div class="info-item"><span class="lbl">Nama:</span><span class="val">${escapeHtml(_latinName || '-')}</span></div>
                                    <div class="info-item"><span class="lbl">No Induk:</span><span class="val">${escapeHtml(String(s.nis ?? '-'))}</span></div>
                                </div>
                            </div>

                            ${makeMainTable()}

                            <div class="page-no"><span>١</span></div>
                        </div>
                    </div>

                    <!-- PAGE 2 -->
                    <div class="page">
                        <div class="page-inner">
                            <div class="ttq-title">
                                <span class="latin">Tahsin dan Tahfidz Al-Qur’an</span>
                                <span class="arab">تحسين القرآن وتحفيظه</span>
                            </div>

                            ${makeTTQTable()}

                            <div class="grid2">
                                <table class="box">
                                    <thead>
                                        <tr><th colspan="3" class="c"><span class="latin">Ketidakhadiran</span> &nbsp;-&nbsp; <span class="arab">أيام الغياب</span></th></tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class="arab r subject-ar" style="width:44%;">لِمَرَضٍ</td>
                                            <td class="latin l subject-id" style="width:40%;">Sakit</td>
                                            <td class="arab c num" style="width:16%;">${hadirSAr}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab r subject-ar">لِاسْتِئْذَانٍ</td>
                                            <td class="latin l subject-id">Ijin</td>
                                            <td class="arab c num">${hadirIAr}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab r subject-ar">بِلَا عُذْرٍ</td>
                                            <td class="latin l subject-id">Alfa</td>
                                            <td class="arab c num">${hadirAAr}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <table class="box">
                                    <thead>
                                        <tr><th colspan="4" class="c"><span class="latin">Kepribadian</span> &nbsp;-&nbsp; <span class="arab">الشخصية</span></th></tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class="arab c num" style="width:12%;">١</td>
                                            <td class="arab r subject-ar" style="width:32%;">السلوك</td>
                                            <td class="latin l subject-id" style="width:34%;">Akhlak</td>
                                            <td class="arab c num" style="width:22%;">${sikapAkhlak}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab c num">٢</td>
                                            <td class="arab r subject-ar">المواظبة</td>
                                            <td class="latin l subject-id">Kerajinan</td>
                                            <td class="arab c num">${sikapRajin}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab c num">٣</td>
                                            <td class="arab r subject-ar">النظافة</td>
                                            <td class="latin l subject-id">Kebersihan</td>
                                            <td class="arab c num">${sikapBersih}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab c num">٤</td>
                                            <td class="arab r subject-ar">الانضباط</td>
                                            <td class="latin l subject-id">Kedisiplinan</td>
                                            <td class="arab c num">${sikapDisiplin}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div class="sig-date-wrap">
                                <div class="sig-date-gap"></div>
                                <div class="sig-date arab">حريرا بكونينجان في ....................................</div>
                                <div class="sig-date-gap"></div>
                            </div>

                            <div class="sig-grid arab" dir="rtl">
                                <div class="sig-col">
                                <div class="sig-title"><div class="latin">Orang Tua / Wali Santri</div><div class="arab">ولي الطالب / الطالبة</div></div>
                                    <div class="sig-line"></div>
                                </div>
                                <div class="sig-col">
                                <div class="sig-title"><div class="latin">Wali Kelas</div><div class="arab">ولي الفصل</div></div>
                                    <div class="sig-line"></div>
                                </div>
                                <div class="sig-col">
                                <div class="sig-title"><div class="latin">Kepala Madrasah</div><div class="arab">رئيس المدرسة</div></div>
                                    <div class="sig-line"></div>
                                </div>
                            </div>

                            <div class="page-no"><span>٢</span></div>
                        </div>
                    </div>

                </div>
            `;

            // Jika dipanggil untuk kebutuhan "gabung rapor" (print semua santri), kembalikan parts saja.
            if (opts && opts.returnParts) {
                return { css, html };
            }
            _printHTML('RAPOR_' + kelas + '_' + s.nis, `<style>${css}</style>${html}`);
        }catch(e){
            console.error(e);
            showToast('Gagal print rapor: ' + (e.message||e), 'error');
        }
    }

    // Kompatibilitas: kalau ada kode lama yang memanggil printLeggerSantri
    // kita arahkan ke print rapor.
function printLeggerSantri(nis, kelas){
        return printRaporSantri(nis, kelas);
    }

// Print rapor untuk semua santri dalam 1 kelas (1 dialog print)
function printRaporKelas(kelas){
    try{
        const list = (students || []).filter(s => String(s.kelas||'') === String(kelas||''));
        if (!list.length){ showToast('Tidak ada santri di kelas ' + kelas, 'error'); return; }

        // ambil css dari santri pertama (format sama)
        const first = printRaporSantri(list[0].nis, kelas, { returnParts:true });
        if (!first || !first.html){ showToast('Gagal membangun rapor kelas', 'error'); return; }
        const css = first.css || '';

        const body = list.map((s, idx) => {
            const parts = (idx === 0) ? first : printRaporSantri(s.nis, kelas, { returnParts:true });
            const block = parts?.html || '';
            // page-break agar tiap santri mulai halaman baru
            return `<div class="rapor-batch-item" style="page-break-after:always">${block}</div>`;
        }).join('');

        _printHTML('RAPOR_KELAS_' + kelas, `<style>${css}</style>${body}`);
    }catch(e){
        console.error(e);
        showToast('Gagal print rapor kelas: ' + (e.message||e), 'error');
    }
}


function _parseKelasParts(k){
    const parts = String(k || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { jenjang:'', jurusan:'', paralel:'', kelas:'' };
    const jenjang = parts[0] || '';
    const paralel = parts.length >= 2 ? parts[parts.length - 1] : '';
    const jurusan = parts.length >= 3 ? parts.slice(1, -1).join(' ') : '';
    return { jenjang, jurusan, paralel, kelas: parts.join(' ') };
}

// Untuk ranking: group "per jenjang" yang diminta user adalah kombinasi seperti
// "X A" / "XI IPA" / "XII IPS" (mengabaikan paralel detail seperti A4).
function _rankJenjangKey(kelasStr){
    const p = _parseKelasParts(kelasStr);
    const j = (p.jenjang || '').trim();
    const jur = (p.jurusan || '').trim();
    const par = (p.paralel || '').trim();
    if (!j) return '';
    if (jur) return `${j} ${jur}`.trim();
    if (par) return `${j} ${par.charAt(0)}`.trim();
    return j;
}

function updateAdminLeggerKelasOptions(init=false){
    const jenSel = document.getElementById('flt-legger-jenjang');
    const jurSel = document.getElementById('flt-legger-jurusan');
    const kelasSel = document.getElementById('admin-legger-kelas');
    if (!jenSel || !jurSel || !kelasSel) return;

    const fJenjang = jenSel.value || '';
    const fJurusan = jurSel.value || '';

    const allKelas = Array.from(new Set((students || []).map(s => String(s.kelas||'').trim()).filter(Boolean)))
        .sort((a,b)=>a.localeCompare(b, 'id'));

    const filtered = allKelas.filter(k => {
        const p = _parseKelasParts(k);
        return (!fJenjang || p.jenjang === fJenjang) && (!fJurusan || p.jurusan === fJurusan);
    });

    const prev = kelasSel.value;
