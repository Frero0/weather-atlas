export async function registerPWA(onUpdate: (worker: ServiceWorker) => void) {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
  const base = import.meta.env.BASE_URL;
  const registration = await navigator.serviceWorker.register(
    base + "serviceworker.js",
    { scope: base, updateViaCache: "none" },
  );
  if (registration.waiting) onUpdate(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller)
        onUpdate(worker);
    });
  });
  await registration.update();
  return registration;
}
export function activateUpdate(worker: ServiceWorker) {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => location.reload(),
    { once: true },
  );
  worker.postMessage("ACTIVATE_UPDATE");
}
