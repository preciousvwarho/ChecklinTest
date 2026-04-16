"use client";

export default function InvitePage() {
  const handleOpenApp = () => {
    const params = new URLSearchParams(window.location.search);
    const invId = params.get("invId");

    const deepLink = `checklin://invite?invId=${invId}`;

    const iosStore = "https://testflight.apple.com/join/g32XFwX5";
    const androidStore =
      "https://play.google.com/apps/internaltest/4701464862425215205";

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    window.location.href = deepLink;

    setTimeout(() => {
      if (isIOS) {
        window.location.href = iosStore;
      } else if (isAndroid) {
        window.location.href = androidStore;
      } else {
        window.location.href = "https://your-website.com";
      }
    }, 1500);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-white text-black text-center">
      <div className="max-w-100 p-5">
        <h2 className="text-xl font-semibold">Checklin Invitation</h2>
        <p className="mt-2">Tap the button below to open app.</p>

        <button
          onClick={handleOpenApp}
          className="mt-5 px-4 py-3 bg-[#0C93CF] text-white rounded-lg"
        >
          Open App
        </button>
      </div>
    </div>
  );
}
