                (function() {
                    var dl = document.getElementById('usernameHistory');
                    function render() {
                        if (!dl) return;
                        var h = JSON.parse(localStorage.getItem('siakad_login_history') || '[]');
                        dl.innerHTML = h.map(function(u) { return '<option value="' + u + '"></option>'; }).join('');
                    }
                    render();
                    try {
                        var h2 = JSON.parse(localStorage.getItem('siakad_login_history') || '[]');
                        var inp = document.getElementById('username');
                        if (h2.length > 0 && inp && !inp.value) inp.value = h2[0];
                    } catch (e) {}
                    window.addEventListener('storage', render);
                    // Auto-isi username & password untuk akun yang pernah login di browser ini
                    var CREDS_KEY = 'siakad_saved_creds';
                    function getCreds() {
                        try { return JSON.parse(localStorage.getItem(CREDS_KEY) || '{}'); } catch (e) { return {}; }
                    }
                    function fillFor(username) {
                        if (!username) return;
                        var c = getCreds()[String(username).toLowerCase()];
                        if (!c) return;
                        var inp = document.getElementById('username');
                        var pw = document.getElementById('password');
                        if (inp && !inp.value) inp.value = username;
                        try { if (pw && !pw.value) pw.value = atob(c.p); } catch (e) {}
                    }
                    function render() {
                        if (!dl) return;
                        var h = JSON.parse(localStorage.getItem('siakad_login_history') || '[]');
                        dl.innerHTML = h.map(function(u) { return '<option value="' + u + '"></option>'; }).join('');
                    }
                    render();
                    try {
                        var h2 = JSON.parse(localStorage.getItem('siakad_login_history') || '[]');
                        var inp0 = document.getElementById('username');
                        if (h2.length > 0 && inp0 && !inp0.value) {
                            inp0.value = h2[0];
                            fillFor(h2[0]);
                        }
                    } catch (e) {}
                    window.addEventListener('load', function() {
                        var u = document.getElementById('username');
                        if (u && u.value) fillFor(u.value);
                    });
                    var userEl = document.getElementById('username');
                    if (userEl) {
                        userEl.addEventListener('change', function() { fillFor(userEl.value.trim()); });
                        userEl.addEventListener('input', function() {
                            var pw = document.getElementById('password');
                            var c = getCreds()[userEl.value.trim().toLowerCase()];
                            if (!c && pw) pw.value = '';
                        });
                    }
                    window._saveLoginHistory = function(u) {
                        if (!u) return;
                        var h = JSON.parse(localStorage.getItem('siakad_login_history') || '[]');
                        h = h.filter(function(x) { return x.toLowerCase() !== u.toLowerCase(); });
                        h.unshift(u);
                        h = h.slice(0, 10);
                        localStorage.setItem('siakad_login_history', JSON.stringify(h));
                        render();
                    };
                })();
