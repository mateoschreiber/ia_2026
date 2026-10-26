/* Utilidades DOM: creación de elementos, limpieza y formato. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === undefined || value === null) return;
      if (key === 'class') node.className = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'text') node.textContent = value;
      else if (key.indexOf('on') === 0 && typeof value === 'function') {
        node.addEventListener(key.slice(2), value);
      } else {
        node.setAttribute(key, value);
      }
    });
    append(node, children);
    return node;
  }

  function append(node, children) {
    if (children === undefined || children === null) return;
    if (Array.isArray(children)) {
      children.forEach(function (c) { append(node, c); });
    } else if (typeof children === 'string' || typeof children === 'number') {
      node.appendChild(document.createTextNode(String(children)));
    } else if (children instanceof Node) {
      node.appendChild(children);
    }
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function fmtNumber(n, digits) {
    var d = digits === undefined ? 2 : digits;
    var num = Number(n);
    if (!isFinite(num)) return '—';
    return num.toLocaleString('es-PY', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function fmtPct(n, digits) {
    var d = digits === undefined ? 1 : digits;
    var num = Number(n);
    if (!isFinite(num)) return '—';
    return num.toLocaleString('es-PY', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
  }

  function fmtKwh(n) {
    return fmtNumber(n, 2) + ' kWh';
  }

  App.dom = {
    el: el,
    append: append,
    clear: clear,
    fmtNumber: fmtNumber,
    fmtPct: fmtPct,
    fmtKwh: fmtKwh
  };
})(window);
