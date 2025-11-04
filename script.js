// Pure JavaScript - no backend needed
ShopifyApp.init({
  apiKey: "ef270783ca1996cfb7dad3912f8355a6", // ← Replace with your app's API key
  shopOrigin: "https://" + window.location.hostname,
});

function showToast() {
  ShopifyApp.flashNotice("Hello from your app!");
}
