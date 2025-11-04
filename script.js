// Pure JavaScript - no backend needed
ShopifyApp.init({
  apiKey: "YOUR_API_KEY_HERE", // ← Replace with your app's API key
  shopOrigin: "https://" + window.location.hostname,
});

function showToast() {
  ShopifyApp.flashNotice("Hello from your app!");
}
