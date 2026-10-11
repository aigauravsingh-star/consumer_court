(function () {
  "use strict";
  if (!window.ConsumerProduct) return;
  let adapter;
  try { adapter = window.localStorage; } catch (_) {
    adapter = { getItem: () => null, setItem: () => { throw Error("Browser storage is unavailable"); },
      removeItem: () => { throw Error("Browser storage is unavailable"); } };
  }
  window.ConsumerStore = ConsumerProduct.createStore(adapter, event =>
    document.dispatchEvent(new CustomEvent("consumer-store", { detail: event })));
  window.addEventListener("beforeunload", event => {
    if (ConsumerStore.hasUnsaved()) { event.preventDefault(); event.returnValue = ""; }
  });
})();
