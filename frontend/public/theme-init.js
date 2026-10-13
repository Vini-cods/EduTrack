// Aplicado antes da renderização para evitar um flash do tema incorreto.
(function () {
  var preference = 'system';
  try { preference = localStorage.getItem('edutrack:theme') || 'system'; } catch (_) {}
  var dark = preference === 'dark' || (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
