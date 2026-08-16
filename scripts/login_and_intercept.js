// Login via fetch and set up error interception
(async function() {
  // Set up error handlers first
  window.__errors = [];
  window.addEventListener('error', function(e) {
    window.__errors.push({t:'err', m: e.error?.message || e.message, s: e.error?.stack?.substring(0,500)});
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.__errors.push({t:'promise', m: e.reason?.message || String(e.reason), s: e.reason?.stack?.substring(0,500)});
  });
  var origCE = console.error;
  console.error = function() {
    var args = Array.from(arguments);
    window.__errors.push({t:'console', m: args.map(function(a) { return typeof a === 'string' ? a : a?.message || String(a); }).join(' | ')});
    origCE.apply(console, args);
  };

  // Login
  try {
    var res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@blivoai.com', password: 'BlivoAdmin2024!' })
    });
    var data = await res.json();
    return 'Login: ' + (data.user ? data.user.name : 'failed');
  } catch(e) {
    return 'Login error: ' + e.message;
  }
})();
