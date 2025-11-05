// Plain JS - loads sample products with metafield values
ShopifyApp.init({
  apiKey: 'ef270783ca1996cfb7dad3912f8355a6',  // Replace with your API key
  shopOrigin: window.location.search.split('shop=')[1]?.split('&')[0] || ''
});

async function loadProducts() {
  try {
    const response = await fetch('/api/2024-10/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': 'TEMP_SESSION_TOKEN'  // Handled by ShopifyApp
      },
      body: JSON.stringify({
        query: `
          query {
            products(first: 5) {
              edges {
                node {
                  id
                  title
                  metafields(first: 10, namespace: "custom", key: "engraving_text") {
                    edges {
                      node { value }
                    }
                  }
                }
              }
            }
          }
        `
      })
    });
    const { data } = await response.json();
    const list = document.getElementById('product-list');
    list.innerHTML = data.products.edges.map(edge => {
      const value = edge.node.metafields.edges[0]?.node.value || 'No engraving text yet';
      return `<li><strong>${edge.node.title}</strong>: ${value}</li>`;
    }).join('');
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function showToast() {
  ShopifyApp.flashNotice('App is working!');
}

// Auto-load on init
loadProducts();
