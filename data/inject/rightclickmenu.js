(function() {
"use strict";

if (!window.__ENABLE_RIGHT_CLICK_SETUP) {
  window.document.addEventListener('contextmenu', (event) => {
    event.stopPropagation();
  }, true);
}
window.__ENABLE_RIGHT_CLICK_SETUP = true;

})();