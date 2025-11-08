// Extract shop and code from URL
const urlParams = new URLSearchParams(window.location.search);
const shop = urlParams.get("shop");
const code = urlParams.get("code");

// Exchange code for access token (Shopify handles this securely)
fetch(`https://${shop}/admin/oauth/access_token`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    client_id: "ef270783ca1996cfb7dad3912f8355a6",
    client_secret: "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", // Use GitHub Secrets for this
    code,
  }),
})
  .then((res) => res.json())
  .then(({ access_token }) => {
    // Create metafield definition via GraphQL
    return fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": access_token,
      },
      body: JSON.stringify({
        query: `
        mutation metafieldsSet {
          metafieldsSet(metafields: [{
            namespace: "custom",
            key: "engraving_text",
            type: "single_line_text_field",
            name: "Engraving Text",
            description: "Custom text for engraving",
            validations: [],
            ownerResource: { type: "PRODUCT" }
          }]) {
            metafields {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      }),
    });
  })
  .then((res) => res.json())
  .then((data) => {
    if (data.data.metafieldsSet.userErrors.length > 0) {
      alert("Error: " + data.data.metafieldsSet.userErrors[0].message);
    } else {
      alert("Success! Custom field added. Redirecting...");
      window.location.href = `/index.html?shop=${shop}`;
    }
  })
  .catch((err) => alert("Install failed: " + err));
