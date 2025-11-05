// ==== CONFIGURATION =========================================================
const API_KEY = "ef270783ca1996cfb7dad3912f8355a6"; // <-- replace with your app's API key
const SCOPES =
  "read_metaobject_definitions,write_metaobject_definitions," +
  "read_metaobjects,write_metaobjects,read_products";

// =============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const AppBridge = window["app-bridge"];
  const createApp = AppBridge.default;
  const actions = AppBridge.actions;

  // --------------------------------------------------------------------- //
  // 1. Get query params (shop, host, embedded, etc.)
  // --------------------------------------------------------------------- //
  const params = new URLSearchParams(location.search);
  const shop = params.get("shop");
  const host = params.get("host");
  const embedded = params.get("embedded") === "1";

  if (!shop || !host) {
    document.body.innerHTML = "<p>Missing shop or host parameter.</p>";
    return;
  }

  // --------------------------------------------------------------------- //
  // 2. Initialise App Bridge
  // --------------------------------------------------------------------- //
  const app = createApp({
    apiKey: API_KEY,
    host,
    forceRedirect: true,
  });

  // --------------------------------------------------------------------- //
  // 3. Authenticate (OAuth) – will redirect if needed
  // --------------------------------------------------------------------- //
  const redirect = AppBridge.actions.Redirect.create(app);
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(
    location.href
  )}`;

  // If we don't have a valid session, start OAuth
  if (!embedded) {
    redirect.dispatch(AppBridge.actions.Redirect.Action.ADMIN_PATH, authUrl);
    return;
  }

  // --------------------------------------------------------------------- //
  // 4. Fetch access token (via your backend proxy) – **GitHub Pages**
  //     cannot store secrets, so we use a tiny serverless function.
  //     For demo purposes we assume you have a Netlify/Vercel function at:
  //     https://YOUR-DEPLOYMENT.netlify.app/.netlify/functions/token
  // --------------------------------------------------------------------- //
  const tokenResponse = await fetch(
    `https://YOUR-DEPLOYMENT.netlify.app/.netlify/functions/token?shop=${shop}`
  );
  const { access_token } = await tokenResponse.json();
  if (!access_token) {
    console.error("Failed to obtain access token");
    return;
  }

  // --------------------------------------------------------------------- //
  // 5. Ensure the product metafield exists
  // --------------------------------------------------------------------- //
  await ensureMetafieldDefinition(access_token, shop);

  // --------------------------------------------------------------------- //
  // 6. Load current product metafield (if we are on a product page)
  // --------------------------------------------------------------------- //
  const productId = await getProductIdFromContext(app);
  if (productId) {
    await loadMetafieldValue(access_token, shop, productId);
  }

  // --------------------------------------------------------------------- //
  // 7. Save on input change (debounced)
  // --------------------------------------------------------------------- //
  const input = document.getElementById("engraving-input");
  let timeout;
  input.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      saveMetafieldValue(access_token, shop, productId, input.value.trim());
    }, 800);
  });
});

// ------------------------------------------------------------------------- //
// Helper: Create metafield definition if it does not exist
// ------------------------------------------------------------------------- //
async function ensureMetafieldDefinition(token, shop) {
  const definitionQuery = `
    query {
      metafieldDefinitions(ownerType: PRODUCT, first: 50) {
        nodes {
          namespace
          key
        }
      }
    }
  `;

  const defsRes = await graphql(token, shop, definitionQuery);
  const exists = defsRes.data.metafieldDefinitions.nodes.some(
    (d) => d.namespace === "custom" && d.key === "engraving_text"
  );

  if (!exists) {
    const mutation = `
      mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          metafieldDefinition {
            id
          }
          userErrors { field message }
        }
      }
    `;

    const variables = {
      definition: {
        name: "Engraving Text",
        namespace: "custom",
        key: "engraving_text",
        description: "Text to engrave on the product",
        ownerType: "PRODUCT",
        type: "single_line_text_field",
        validations: [],
      },
    };

    await graphql(token, shop, mutation, variables);
    console.log("Metafield definition created");
  }
}

// ------------------------------------------------------------------------- //
// Helper: Load current metafield value for the product
// ------------------------------------------------------------------------- //
async function loadMetafieldValue(token, shop, productId) {
  const query = `
    query {
      product(id: "gid://shopify/Product/${productId}") {
        metafield(namespace: "custom", key: "engraving_text") {
          value
        }
      }
    }
  `;

  const res = await graphql(token, shop, query);
  const value =
    res.data?.product?.metafield?.value || "";
  document.getElementById("engraving-input").value = value;
}

// ------------------------------------------------------------------------- //
// Helper: Save metafield value
// ------------------------------------------------------------------------- //
async function saveMetafieldValue(token, shop, productId, value) {
  const mutation = `
    mutation metafieldUpsert($metafields: [MetafieldInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
        }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        ownerId: `gid://shopify/Product/${productId}`,
        namespace: "custom",
        key: "engraving_text",
        value,
        type: "single_line_text_field",
      },
    ],
  };

  await graphql(token, shop, mutation, variables);
  console.log("Metafield saved:", value);
}

// ------------------------------------------------------------------------- //
// Helper: Generic GraphQL request
// ------------------------------------------------------------------------- //
async function graphql(token, shop, query, variables = {}) {
  const endpoint = `https://${shop}/admin/api/2025-10/graphql.json`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", json.errors);
    throw new Error(json.errors[0].message);
  }
  return json;
}

// ------------------------------------------------------------------------- //
// Helper: Extract product ID from App Bridge context (when embedded)
// ------------------------------------------------------------------------- //
async function getProductIdFromContext(app) {
  const { resource } = await app.getState();
  // resource example: { type: "PRODUCT", id: "1234567890" }
  if (resource?.type === "PRODUCT") {
    return resource.id;
  }
  return null;
}
