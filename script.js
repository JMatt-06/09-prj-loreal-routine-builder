/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards and enable selection */
// Load selected products from localStorage if available
let selectedProducts = [];
const savedProducts = localStorage.getItem("selectedProducts");
if (savedProducts) {
  try {
    selectedProducts = JSON.parse(savedProducts);
  } catch (e) {
    selectedProducts = [];
  }
}
let currentDisplayedProducts = [];
let conversationHistory = [];

function displayProducts(products) {
  currentDisplayedProducts = products;
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if product is selected
      const isSelected = selectedProducts.some((p) => p.name === product.name);
      return `
    <div class="product-card${isSelected ? " selected" : ""}" data-name="${
        product.name
      }">
      <div class="product-image-wrapper">
        <img src="${product.image}" alt="${product.name}" class="product-image">
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <div class="product-desc">${product.description}</div>
      </div>
    </div>
  `;
    })
    .join("");

  // Add click event listeners to product cards for selection
  const cards = document.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const name = card.getAttribute("data-name");
      const product = products.find((p) => p.name === name);
      const index = selectedProducts.findIndex((p) => p.name === name);
      if (index === -1) {
        // Add product if not selected
        selectedProducts.push(product);
      } else {
        // Remove product if already selected
        selectedProducts.splice(index, 1);
      }
      // Save to localStorage
      localStorage.setItem(
        "selectedProducts",
        JSON.stringify(selectedProducts)
      );
      displayProducts(currentDisplayedProducts); // Update grid highlight
      updateSelectedProducts(); // Update selected list
    });
  });
}

/* Update the Selected Products section */
function updateSelectedProducts() {
  // Use the correct container for selected products list
  const selectedSection = document.getElementById("selectedProductsList");
  if (!selectedSection) return;
  if (selectedProducts.length === 0) {
    selectedSection.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    // Add Clear All button only if there are saved products
    if (localStorage.getItem("selectedProducts")) {
      selectedSection.innerHTML += `<button id="clearAllBtn" style="margin-top:10px;">Clear All</button>`;
      document.getElementById("clearAllBtn").onclick = () => {
        selectedProducts = [];
        localStorage.removeItem("selectedProducts");
        updateSelectedProducts();
        displayProducts(currentDisplayedProducts);
      };
    }
    return;
  }
  selectedSection.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-item">
        <img src="${product.image}" alt="${product.name}">
        <span>${product.name}</span>
        <button class="remove-btn" data-name="${product.name}">Remove</button>
      </div>
    `
    )
    .join("");
  // Add Clear All button
  selectedSection.innerHTML += `<button id="clearAllBtn" style="margin-top:10px;">Clear All</button>`;
  document.getElementById("clearAllBtn").onclick = () => {
    selectedProducts = [];
    localStorage.removeItem("selectedProducts");
    updateSelectedProducts();
    displayProducts(currentDisplayedProducts);
  };
  // Add event listeners for remove buttons
  const removeBtns = selectedSection.querySelectorAll(".remove-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name");
      const index = selectedProducts.findIndex((p) => p.name === name);
      if (index !== -1) {
        selectedProducts.splice(index, 1);
        localStorage.setItem(
          "selectedProducts",
          JSON.stringify(selectedProducts)
        );
        updateSelectedProducts();
        displayProducts(currentDisplayedProducts);
      }
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
  updateSelectedProducts(); // Ensure selected products section updates
});

/* Add a search field for filtering products by name or keyword */
// 1. Create the search input and add it above the products grid
const searchSection = document.createElement("div");
searchSection.className = "search-section";
searchSection.innerHTML = `
  <input
    type="text"
    id="productSearch"
    placeholder="Search products by name or keyword..."
    style="margin-bottom:16px; padding:8px 12px; width:100%; max-width:400px; border-radius:8px; border:1px solid #ccc;"
  />
`;
categoryFilter.parentNode.insertBefore(
  searchSection,
  categoryFilter.nextSibling
);

// 2. Add event listener for search input
const searchInput = document.getElementById("productSearch");
let allProducts = []; // Store all products for searching

// Load all products once for searching and filtering
async function initializeProducts() {
  allProducts = await loadProducts();
  displayProducts(allProducts);
  updateSelectedProducts();
}
initializeProducts();

// 3. Update displayProducts to use both category and search filters
function filterAndDisplayProducts() {
  let filtered = allProducts;

  // Filter by category if selected
  const selectedCategory = categoryFilter.value;
  if (selectedCategory) {
    filtered = filtered.filter(
      (product) => product.category === selectedCategory
    );
  }

  // Filter by search keyword if entered
  const keyword = searchInput.value.trim().toLowerCase();
  if (keyword) {
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        product.brand.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword)
    );
  }

  displayProducts(filtered);
  updateSelectedProducts();
}

// 4. Listen for changes in category and search input
categoryFilter.addEventListener("change", filterAndDisplayProducts);
searchInput.addEventListener("input", filterAndDisplayProducts);

/* Initial call to update selected products section */
document.addEventListener("DOMContentLoaded", () => {
  updateSelectedProducts();
  // Add event listener for Generate Routine button (id: generateRoutine)
  const generateBtn = document.getElementById("generateRoutine");
  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      // Collect selected products
      if (selectedProducts.length === 0) {
        chatWindow.innerHTML =
          "Please select products before generating a routine.";
        return;
      }

      // Prepare data for OpenAI
      const productData = selectedProducts.map((p) => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
      }));

      // Show loading message
      chatWindow.innerHTML = "Generating your routine...";

      // Get API key from secrets.js
      // Note: secrets.js must be loaded in index.html before script.js
      if (typeof OPENAI_API_KEY === "undefined") {
        chatWindow.innerHTML =
          "API key not found. Please add it to secrets.js.";
        return;
      }

      // Prepare messages for OpenAI API
      const messages = [
        {
          role: "system",
          content:
            "You are a helpful skincare expert. Only answer questions about skincare, haircare, makeup, fragrance, and routines. If asked about other topics, politely refuse.",
        },
        {
          role: "user",
          content: `Here are the selected products: ${JSON.stringify(
            productData,
            2
          )}. Please create a skincare routine using these.`,
        },
      ];
      conversationHistory = [...messages]; // Start history with initial routine request

      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: messages,
            }),
          }
        );
        const data = await response.json();
        // Check for response content
        if (
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content
        ) {
          // Format routine step by step for readability
          const routineText = data.choices[0].message.content;
          // Add assistant's routine to history
          conversationHistory.push({ role: "assistant", content: routineText });
          // Split by line breaks and numbers (e.g., "1. Step")
          const steps = routineText
            .split(/\n+|(?=\d+\.)/)
            .filter((s) => s.trim() !== "");
          chatWindow.innerHTML = `<div class="routine-result">${steps
            .map(
              (step) =>
                `<div class="routine-step" style="margin-bottom:18px;">${step.trim()}</div>`
            )
            .join("")}</div>`;
        } else {
          chatWindow.innerHTML =
            "Sorry, no routine was generated. Please try again.";
        }
      } catch (error) {
        chatWindow.innerHTML =
          "Error generating routine. Please check your API key and internet connection.";
      }
    });
  }
  // ...existing code...

  /* Chat form submission handler - now supports follow-up questions */
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userInput = document.getElementById("userInput").value.trim();
    if (!userInput) return;

    // Add user's question to conversation history
    conversationHistory.push({ role: "user", content: userInput });

    // Show loading message
    chatWindow.innerHTML = "Thinking...";

    // Get API key from secrets.js
    if (typeof OPENAI_API_KEY === "undefined") {
      chatWindow.innerHTML = "API key not found. Please add it to secrets.js.";
      return;
    }
    try {
      const response = await fetch(
        "https://lorealbotprod.matthew-joshs06.workers.dev/", // <-- Use your Worker endpoint here
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // No Authorization header needed; Worker handles it
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: conversationHistory,
          }),
        }
      );
      const data = await response.json();
      if (
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
      ) {
        // Add assistant's reply to history
        conversationHistory.push({
          role: "assistant",
          content: data.choices[0].message.content,
        });
        // Show only the latest user question and latest assistant response after a follow-up
        // If only routine, show routine as before
        const filtered = conversationHistory.filter((msg, idx) => {
          // Hide system messages
          if (msg.role === "system") return false;
          // Hide the initial product JSON message
          if (
            msg.role === "user" &&
            idx === 1 &&
            msg.content.startsWith("Here are the selected products:")
          ) {
            return false;
          }
          return true;
        });
        // Find the routine message
        const routineIdx = filtered.findIndex(
          (m, i) =>
            m.role === "assistant" &&
            (m.content.includes("1.") || m.content.includes("Step 1"))
        );
        // If only routine, show routine as before
        if (filtered.length === 2 && routineIdx === 1) {
          const steps = filtered[1].content
            .split(/\n+|(?=\d+\.)/)
            .filter((s) => s.trim() !== "");
          chatWindow.innerHTML = `<div class=\"routine-result\">${steps
            .map(
              (step) =>
                `<div class=\"routine-step\" style=\"margin-bottom:18px;\">${step.trim()}</div>`
            )
            .join("")}</div>`;
          return;
        }
        // Otherwise, show only the latest user question and latest assistant response
        const lastUserIdx = filtered
          .map((msg, idx) => (msg.role === "user" ? idx : -1))
          .filter((idx) => idx !== -1)
          .pop();
        const lastAssistantIdx = filtered
          .map((msg, idx) => (msg.role === "assistant" ? idx : -1))
          .filter((idx) => idx !== -1)
          .pop();
        let html = "";
        if (typeof lastUserIdx === "number" && lastUserIdx >= 0) {
          html += `<div class=\"chat-user\" style=\"margin:12px 0 6px 0;max-width:80%;background:#e6f0ff;border-radius:16px 16px 4px 16px;padding:12px 18px;color:#007bff;box-shadow:0 1px 4px rgba(0,123,255,0.04);float:right;clear:both;\"><b>You:</b> ${filtered[lastUserIdx].content}</div>`;
        }
        if (typeof lastAssistantIdx === "number" && lastAssistantIdx >= 0) {
          // Routine formatting if this is the routine
          if (
            lastAssistantIdx === routineIdx &&
            filtered[lastAssistantIdx].content &&
            (filtered[lastAssistantIdx].content.includes("1.") ||
              filtered[lastAssistantIdx].content.includes("Step 1"))
          ) {
            const steps = filtered[lastAssistantIdx].content
              .split(/\n+|(?=\d+\.)/)
              .filter((s) => s.trim() !== "");
            html += `<div class=\"routine-result\">${steps
              .map(
                (step) =>
                  `<div class=\"routine-step\" style=\"margin-bottom:18px;\">${step.trim()}</div>`
              )
              .join("")}</div>`;
          } else if (/(^|\n)[\-*] /.test(filtered[lastAssistantIdx].content)) {
            // Bullet points
            const lines = filtered[lastAssistantIdx].content.split(/\n+/);
            let inList = false;
            let assistantHtml = "";
            lines.forEach((line) => {
              if (/^[\-*] /.test(line.trim())) {
                if (!inList) {
                  assistantHtml +=
                    "<ul style='margin:8px 0 8px 18px;padding:0;'>";
                  inList = true;
                }
                assistantHtml += `<li style='margin-bottom:6px;'>${line.replace(
                  /^[\-*] /,
                  ""
                )}</li>`;
              } else {
                if (inList) {
                  assistantHtml += "</ul>";
                  inList = false;
                }
                assistantHtml += `<div>${line}</div>`;
              }
            });
            if (inList) assistantHtml += "</ul>";
            html += `<div class=\"chat-assistant\" style=\"margin:10px 0 18px 0;max-width:80%;background:#f8faff;border-radius:16px 16px 16px 4px;padding:12px 18px;color:#222;box-shadow:0 1px 4px rgba(0,123,255,0.04);float:left;clear:both;\">${assistantHtml}</div>`;
          } else if (/(^|\n)\d+\. /.test(filtered[lastAssistantIdx].content)) {
            // Numbered list
            const lines = filtered[lastAssistantIdx].content.split(/\n+/);
            let inList = false;
            let assistantHtml = "";
            lines.forEach((line) => {
              if (/^\d+\. /.test(line.trim())) {
                if (!inList) {
                  assistantHtml +=
                    "<ol style='margin:8px 0 8px 18px;padding:0;'>";
                  inList = true;
                }
                assistantHtml += `<li style='margin-bottom:6px;'>${line.replace(
                  /^\d+\. /,
                  ""
                )}</li>`;
              } else {
                if (inList) {
                  assistantHtml += "</ol>";
                  inList = false;
                }
                assistantHtml += `<div>${line}</div>`;
              }
            });
            if (inList) assistantHtml += "</ol>";
            html += `<div class=\"chat-assistant\" style=\"margin:10px 0 18px 0;max-width:80%;background:#f8faff;border-radius:16px 16px 16px 4px;padding:12px 18px;color:#222;box-shadow:0 1px 4px rgba(0,123,255,0.04);float:left;clear:both;\">${assistantHtml}</div>`;
          } else {
            // Default assistant bubble
            html += `<div class=\"chat-assistant\" style=\"margin:10px 0 18px 0;max-width:80%;background:#f8faff;border-radius:16px 16px 16px 4px;padding:12px 18px;color:#222;box-shadow:0 1px 4px rgba(0,123,255,0.04);float:left;clear:both;\">${filtered[lastAssistantIdx].content}</div>`;
          }
        }
        chatWindow.innerHTML = html;
      }
    } catch (error) {
      chatWindow.innerHTML =
        "Error generating response. Please check your API key and internet connection.";
    }
  });
});
