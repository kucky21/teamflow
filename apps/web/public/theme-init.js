(function () {
  try {
    var stored = localStorage.getItem('teamflow-theme');
    var dark =
      stored === 'dark' ||
      ((!stored || stored === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* localStorage nemusí být dostupné */
  }
})();
