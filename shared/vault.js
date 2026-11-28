/* VERTEX · per-user encrypted vault (feature VX-023, handoff stage 1).
   Stores small secrets — first the MSP LIVE device token — online, per subscription and per user, and restores them after sign-in.
   - Encryption happens in the browser: AES-GCM 256 with a key derived from the user's password (PBKDF2-SHA-256, 250 000 rounds,
     salt = subscription + user). The cloud only ever receives ciphertext, so another subscription (or anyone reading the storage)
     cannot read the token. The key itself is kept non-extractable in this browser's IndexedDB until sign-out.
   - Cloud doc: "vxv-<subscription|eco>-<user>" → { v:1, iv, ct, t, dev }.
   - The key is created at sign-in (admin login form) and re-made on password change, which re-encrypts the vault.
   Limits (test mode on GitHub Pages): the storage is reachable without a server-side account check; protection relies on the
   password, so a weak password (e.g. 123456) can be guessed offline. Move to the private host for real account isolation. */
(function () {
  'use strict';
  if (window.VXVAULT) return;
  var enc = new TextEncoder(), dec = new TextDecoder(), DB = 'vxvault', ST = 'keys';
  var b64 = function (u) { var s = ''; u = new Uint8Array(u); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s) };
  var unb64 = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u };
  function sess() { try { return JSON.parse(localStorage.getItem('vxSess') || sessionStorage.getItem('vxSess') || 'null') } catch (e) { return null } }
  function who(s) { s = s || sess(); if (!s || !s.u) return null; return { tc: String(s.tc || 'eco').toLowerCase().replace(/[^a-z0-9]/g, ''), u: String(s.u).toLowerCase().replace(/[^a-z0-9._-]/g, '') } }
  function doc(w) { return 'vxv-' + w.tc + '-' + w.u.replace(/[^a-z0-9]/g, '') }
  function idb() { return new Promise(function (ok, no) { var r = indexedDB.open(DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore(ST) }; r.onsuccess = function () { ok(r.result) }; r.onerror = function () { no(r.error) } }) }
  function kv(mode, fn) { return idb().then(function (db) { return new Promise(function (ok, no) { var t = db.transaction(ST, mode), q = fn(t.objectStore(ST)); t.oncomplete = function () { ok(q && q.result) }; t.onerror = function () { no(t.error) } }) }) }
  function derive(pw, w) {
    return crypto.subtle.importKey('raw', enc.encode(String(pw)), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: 250000, salt: enc.encode('vertex-vault|' + w.tc + '|' + w.u) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    })
  }
  function key(w) { return kv('readonly', function (s) { return s.get(w.tc + '|' + w.u) }) }
  function cloud() { var C = window.VX_CLOUD; if (!C || !C.on) throw new Error('no-cloud'); return C }
  function seal(k, obj) { var iv = crypto.getRandomValues(new Uint8Array(12)); return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(JSON.stringify(obj))).then(function (ct) { return { v: 1, iv: b64(iv), ct: b64(ct), t: Date.now(), dev: (navigator.platform || '').slice(0, 40) } }) }
  function open(k, box) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, k, unb64(box.ct)).then(function (pt) { return JSON.parse(dec.decode(pt)) }) }
  function readBox(w) { return cloud().getDoc(doc(w)).then(function (j) { var b = j && j.data && j.data.ct ? j.data : j; return b && b.ct ? b : null }) }
  var V = {
    /* called at sign-in with the typed password (session must already be saved) */
    unlock: function (pw, s, tries) { var w = who(s); if (!window.crypto || !crypto.subtle) return Promise.resolve(false);  // the session may be saved a moment after sign-in
      if (!w) { tries = (tries || 0) + 1; return tries > 40 ? Promise.resolve(false) : new Promise(function (r) { setTimeout(r, 250) }).then(function () { return V.unlock(pw, s, tries) }) }
      return derive(pw, w).then(function (k) { return kv('readwrite', function (st) { return st.put(k, w.tc + '|' + w.u) }) }).then(function () { return true }).catch(function () { return false }) },
    has: function () { var w = who(); return w ? key(w).then(function (k) { return !!k }).catch(function () { return false }) : Promise.resolve(false) },
    lock: function () { try { indexedDB.deleteDatabase(DB) } catch (e) { } },
    /* read everything stored for this user: { mspToken, savedAt, ... } or null */
    read: function () { var w = who(); if (!w) return Promise.reject(new Error('no-session')); return Promise.all([key(w), readBox(w)]).then(function (a) { if (!a[1] || a[1].deleted) return null; if (!a[0]) throw new Error('locked'); return open(a[0], a[1]).catch(function () { throw new Error('wrong-key') }) }) },
    /* merge fields into the vault */
    write: function (patch) { var w = who(); if (!w) return Promise.reject(new Error('no-session')); return key(w).then(function (k) { if (!k) throw new Error('locked'); return V.read().catch(function () { return null }).then(function (cur) { var o = Object.assign({}, cur || {}, patch); Object.keys(o).forEach(function (x) { if (o[x] == null) delete o[x] }); return seal(k, o) }).then(function (box) { return cloud().putDoc(doc(w), box).then(function () { return box.t }) }) }) },
    wipe: function () { var w = who(); if (!w) return Promise.reject(new Error('no-session')); return cloud().putDoc(doc(w), { v: 1, deleted: true, t: Date.now() }) },
    /* password change: decrypt with the old key, store the new key, re-encrypt */
    rekey: function (newPw) { var w = who(); if (!w) return Promise.resolve(false); return V.read().catch(function () { return null }).then(function (cur) { return V.unlock(newPw).then(function () { return cur ? V.write(cur) : null }) }).then(function () { return true }).catch(function () { return false }) },
    who: who, doc: function () { var w = who(); return w ? doc(w) : '' }
  };
  window.VXVAULT = V;
})();
