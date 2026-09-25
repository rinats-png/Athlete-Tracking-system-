// Theme vor dem ersten Paint setzen (wie in der App), damit nichts aufblitzt.
(function () {
  try {
    var stored = localStorage.getItem('kydon.theme')
    if (stored === 'light' || stored === 'dark') document.documentElement.setAttribute('data-theme', stored)
  } catch (e) {}
})()
