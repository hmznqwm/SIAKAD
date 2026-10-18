<button type="button" id="darkToggleBtn" onclick="toggleDaftarTheme()" title="Ganti tampilan gelap/terang" aria-label="Ganti tampilan gelap/terang">
    <svg id="daftarIconMoon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
    <svg id="daftarIconSun" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><path d="M12 4.5V2m0 20v-2.5M4.5 12H2m20 0h-2.5M6.3 6.3L4.6 4.6m14.8 14.8l-1.7-1.7M6.3 17.7l-1.7 1.7M19.4 4.6l-1.7 1.7M12 17a5 5 0 100-10 5 5 0 000 10z"/></svg>
</button>
<div class="wrap">

<!-- HERO -->
<div class="hero">
    <div class="hero-grid"></div>
    <div class="hero-glow"></div>
    <div class="hero-badge">
        <span class="dot"></span>
        PPDB · Tahun Ajaran 2026/2027
    </div>
    <div class="hero-content">
        <div class="hero-title">Formulir Pendaftaran<br>Siswa Baru</div>
        <div class="hero-sub">Isi dengan lengkap dan benar</div>
    </div>
    <div class="hero-steps">
        <div class="step-dot active"></div>
        <div class="step-dot"></div>
        <div class="step-dot"></div>
    </div>
</div>

<!-- NOTICE -->
<div class="notice-bar">
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
    Pastikan data sesuai dokumen resmi. Pendaftaran yang sudah dikirim tidak dapat diubah.
</div>

<!-- FORM SHELL -->
<div class="form-shell" id="formShell">

    <!-- SECTION 1: IDENTITAS -->
    <div class="card">
        <div class="sec">
            <div class="sec-num">1</div>
            <div>
                <div class="sec-label">Identitas Calon Siswa</div>
                <div class="sec-sub">Data pribadi sesuai akta kelahiran / KK</div>
            </div>
        </div>

        <div class="field">
            <label for="dNama" class="req">Nama Lengkap</label>
            <div class="input-wrap has-ico">
                <span class="input-ico">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm-4 7a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"/></svg>
                </span>
                <input type="text" id="dNama" placeholder="Sesuai akta kelahiran" autocomplete="name">
            </div>
            <span class="err-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                Nama lengkap wajib diisi
            </span>
        </div>

        <div class="field">
            <label for="dNisn" class="req">NISN</label>
            <div class="input-wrap has-ico">
                <span class="input-ico">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path stroke-linecap="round" d="M3 10h18"/></svg>
                </span>
                <input type="text" id="dNisn" placeholder="Nomor Induk Siswa Nasional" inputmode="numeric">
            </div>
            <span class="err-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                NISN wajib diisi
            </span>
        </div>

        <div class="field">
            <label for="dKelas" class="req">Jurusan Pilihan</label>
            <div class="sel-wrap has-ico">
                <span class="input-ico">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m-4-4.5L4 17l8 4 8-4-4-2.5"/></svg>
                </span>
                <select id="dKelas">
                    <option value="">— Pilih Jurusan —</option>
                    <option value="RPL">Rekayasa Perangkat Lunak (RPL)</option>
                    <option value="TKJ">Teknik Komputer &amp; Jaringan (TKJ)</option>
                    <option value="MM">Multimedia (MM)</option>
                    <option value="AKL">Akuntansi &amp; Keuangan Lembaga (AKL)</option>
                    <option value="OTKP">Otomatisasi &amp; Tata Kelola Perkantoran (OTKP)</option>
                    <option value="TBSM">Teknik &amp; Bisnis Sepeda Motor (TBSM)</option>
                    <option value="DPIB">Desain Pemodelan &amp; Info Bangunan (DPIB)</option>
                </select>
            </div>
            <span class="err-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                Pilih jurusan yang diminati
            </span>
        </div>

        <div class="row">
            <div class="field">
                <label for="dJk" class="req">Jenis Kelamin</label>
                <div class="sel-wrap">
                    <select id="dJk">
                        <option value="">— Pilih —</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                    </select>
                </div>
                <span class="err-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Wajib dipilih
                </span>
            </div>
            <div class="field">
                <label for="dAgama" class="req">Agama</label>
                <div class="sel-wrap">
                    <select id="dAgama">
                        <option value="">— Pilih —</option>
                        <option>Islam</option>
                        <option>Kristen</option>
                        <option>Katolik</option>
                        <option>Hindu</option>
                        <option>Buddha</option>
                        <option>Lainnya</option>
                    </select>
                </div>
                <span class="err-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Wajib dipilih
                </span>
            </div>
        </div>

        <div class="row">
            <div class="field">
                <label for="dTempat" class="req">Tempat Lahir</label>
                <input type="text" id="dTempat" placeholder="Mis. Malang">
                <span class="err-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Wajib diisi
                </span>
            </div>
            <div class="field">
                <label for="dTgl" class="req">Tanggal Lahir</label>
                <input type="date" id="dTgl">
                <span class="err-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Wajib diisi
                </span>
            </div>
        </div>
    </div>

    <div class="section-divider"></div>

    <!-- SECTION 2: ORANG TUA & KONTAK -->
    <div class="card">
        <div class="sec">
            <div class="sec-num">2</div>
            <div>
                <div class="sec-label">Orang Tua &amp; Kontak</div>
                <div class="sec-sub">Data orang tua dan nomor yang dapat dihubungi</div>
            </div>
        </div>

        <div class="row">
            <div class="field">
                <label for="dAyah" class="req">Nama Ayah</label>
                <input type="text" id="dAyah" placeholder="Nama lengkap ayah">
                <span class="err-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Nama ayah wajib diisi
                </span>
            </div>
            <div class="field">
                <label for="dIbu" class="req">Nama Ibu</label>
                <input type="text" id="dIbu" placeholder="Nama lengkap ibu">
                <span class="err-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Nama ibu wajib diisi
                </span>
            </div>
        </div>

        <div class="row">
            <div class="field">
                <label for="dHp" class="req">No. Handphone</label>
                <div class="input-wrap has-ico">
                    <span class="input-ico">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 0 1 2-2h1.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 0 1.414L8.293 8.535a11.05 11.05 0 0 0 5.172 5.172l1.414-1.414a1 1 0 0 1 1.414 0l2.414 2.414A1 1 0 0 1 19 16H19a2 2 0 0 1-2 2h-1C7.163 18 2 12.837 2 6V5z"/></svg>
                    </span>
                    <input type="tel" id="dHp" placeholder="08xxxxxxxxxx" inputmode="tel">
                </div>
                <span class="err-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    No. HP wajib diisi
                </span>
            </div>
            <div class="field">
                <label for="dEmail" class="req">Email</label>
                <div class="input-wrap has-ico">
                    <span class="input-ico">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/></svg>
                    </span>
                    <input type="email" id="dEmail" placeholder="nama@email.com" inputmode="email">
                </div>
                <span class="err-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Email tidak valid
                </span>
            </div>
        </div>

        <div class="field">
            <label for="dAlamat" class="req">Alamat Lengkap</label>
            <textarea id="dAlamat" placeholder="Jl. Nama Jalan No. xx, RT/RW, Kelurahan, Kecamatan, Kab/Kota"></textarea>
            <span class="err-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                Alamat wajib diisi
            </span>
        </div>
    </div>

    <div class="section-divider"></div>

    <!-- SECTION 3: BERKAS -->
    <div class="card">
        <div class="sec">
            <div class="sec-num">3</div>
            <div>
                <div class="sec-label">Unggah Berkas</div>
                <div class="sec-sub">Akta lahir, KK, atau foto siswa — JPG/PNG/PDF, maks 2 MB</div>
            </div>
        </div>

        <div class="field">
            <label for="dBerkas" class="req">Berkas Pendukung</label>
            <label class="upload-zone" id="uploadZone">
                <input type="file" id="dBerkas" accept=".jpg,.jpeg,.png,.pdf">
                <div class="upload-icon" id="uploadIcoWrap">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" id="uploadIco"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 12V4m0 0-3 3m3-3 3 3"/></svg>
                </div>
                <div class="upload-name" id="upName">Pilih atau seret berkas ke sini</div>
                <div class="upload-hint" id="upHint">JPG, PNG, atau PDF — maksimal 2 MB</div>
            </label>
            <span class="err-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                Berkas wajib diunggah (JPG/PNG/PDF, maks 2 MB)
            </span>
        </div>
    </div>

    <!-- SUBMIT -->
    <div class="submit-card">
        <button type="button" id="btnDaftar" class="btn-submit" onclick="handleSubmit()">
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            Kirim Pendaftaran
        </button>
        <p class="submit-note">Data Anda diproses secara aman dan hanya digunakan untuk keperluan pendaftaran.</p>
    </div>

</div><!-- /form-shell -->

<!-- SUCCESS SCREEN -->
<div id="sukses-screen">
    <div class="sukses-ico">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <div class="sukses-title">Pendaftaran Terkirim!</div>
    <p class="sukses-msg" id="suksesMsg">Formulir Anda berhasil kami terima dan sedang dalam antrean verifikasi oleh pihak sekolah. Mohon simpan informasi berikut sebagai tanda bukti.</p>
    <div class="sukses-card" id="suksesSummary"></div>
</div>

</div><!-- /wrap -->

<!-- TOAST CONTAINER -->
<div class="toast-container" id="toastContainer"></div>

<!-- MODAL KONFIRMASI -->
<div class="backdrop" id="modalBackdrop">
    <div class="modal">
        <div class="modal-ico">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h3>Periksa Kembali Data Anda</h3>
        <p class="modal-body">Pastikan semua data <strong>sudah benar</strong> sebelum mengirim. Data yang sudah terkirim tidak dapat diubah.</p>
        <div class="modal-divider"></div>
        <div class="modal-summary" id="modalSummary"></div>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="tutupModal()">← Periksa Lagi</button>
            <button class="btn-confirm" id="btnYakin" onclick="kirimPendaftaran()">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                Ya, Kirim!
            </button>
        </div>
    </div>
</div>

