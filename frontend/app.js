const API = "https://miniinventory.onrender.com";

let products = [];
let editingProductId = null;
let allTransactions = [];
let filteredTransactions = [];


// =========================================
// START
// =========================================

document.addEventListener("DOMContentLoaded", () => {

  setupNavigation();

  setupProductForm();

  setupEditProduct();

  setupAI();

  setupReportExport();

  setupTransactionFilters();

  setupSettings();

  loadProducts();

  updateDateTime();

  if (!window.stocklyDateTimeStarted) {

    window.stocklyDateTimeStarted = true;

    setInterval(
      updateDateTime,
      1000
    );

  }

});


// =========================================
// NAVIGATION
// =========================================

function setupNavigation() {

  document.querySelectorAll(".nav-item").forEach(btn => {

    btn.addEventListener("click", () => {

      showPage(btn.dataset.page);

    });

  });


  document.querySelectorAll("[data-page-link]").forEach(el => {

    el.addEventListener("click", e => {

      e.preventDefault();

      showPage(el.dataset.pageLink);

    });

  });


  document
    .getElementById("addProductBtn")
    ?.addEventListener("click", () => {

      showPage("add");

    });


  document
    .getElementById("globalSearch")
    ?.addEventListener("input", () => {

      filterProducts();

    });


  document
    .getElementById("productSearch")
    ?.addEventListener("input", () => {

      filterProducts();

    });


  document
    .querySelector("#page-products .filters select:nth-of-type(1)")
    ?.addEventListener("change", () => {

      filterProducts();

    });


  document
    .querySelector("#page-products .filters select:nth-of-type(2)")
    ?.addEventListener("change", () => {

      filterProducts();

    });

}


// =========================================
// SHOW PAGE
// =========================================

function showPage(page) {

  document
    .querySelectorAll(".page")
    .forEach(p => {

      p.classList.remove("active-page");

    });


  const targetPage =
    document.getElementById(`page-${page}`);


  if (targetPage) {

    targetPage.classList.add("active-page");

  }


  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });


  if (page === "transactions") {

    loadTransactions();

  }


  if (page === "dashboard") {

    loadDashboardTransactions();

    updateDashboard();

    updateDashboardGreeting();

  }


  if (page === "categories") {

    renderCategories();

  }


  if (page === "reports") {

    loadReports();

  }


  if (page === "settings") {

    loadSettings();

  }

}


// =========================================
// LOAD PRODUCTS
// =========================================

async function loadProducts() {

  try {

    const res =
      await fetch(
        `${API}/api/products`
      );


    if (!res.ok) {

      throw new Error(
        `Server error: ${res.status}`
      );

    }


    const data =
      await res.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "Unable to load products."
      );

    }


    products =
      Array.isArray(data.products)
        ? data.products
        : [];


    renderProducts(products);

    updateDashboard();

    setupCategoryFilter();

    renderCategories();

    await loadDashboardTransactions();


  } catch (err) {

    console.error(
      "Products loading error:",
      err
    );


    products = [];

    renderProducts([]);

    updateDashboard();

    renderCategories();

    showProductLoadingError();

  }

}


// =========================================
// PRODUCT STATUS
// =========================================

function statusOf(product) {

  const quantity =
    Number(product.quantity || 0);


  const minimum =
    Number(product.minimum || 0);


  if (quantity === 0) {

    return [
      "Out of Stock",
      "red"
    ];

  }


  if (quantity <= minimum) {

    return [
      "Low Stock",
      "yellow"
    ];

  }


  return [
    "In Stock",
    "green"
  ];

}


// =========================================
// RENDER PRODUCTS
// =========================================

function renderProducts(list) {

  const body =
    document.getElementById(
      "productsBody"
    );


  if (!body) return;


  if (!list.length) {

    body.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          No products found. Add your first product.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML = list
    .map(product => {

      const [
        status,
        cls
      ] = statusOf(product);


      return `
        <tr>

          

          <td>

            <b>
              ${escapeHtml(product.name)}
            </b>

          </td>


          <td>
            ${escapeHtml(product.category)}
          </td>


          <td>
            ${formatCurrency(product.price)}
          </td>


          <td>
            ${Number(product.quantity || 0)}
          </td>


          <td>

            <span class="tag ${cls}">
              ${status}
            </span>

          </td>


          <td>

            <div class="product-actions">

              <button
                type="button"
                class="edit-product-btn"
                data-id="${escapeHtml(product.id)}"
              >
                Edit
              </button>


              <button
                type="button"
                class="delete-product-btn"
                data-id="${escapeHtml(product.id)}"
              >
                Delete
              </button>

            </div>

          </td>

        </tr>
      `;

    })
    .join("");


  document
    .querySelectorAll(".edit-product-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openEditProduct(
            button.dataset.id
          );

        }
      );

    });


  document
    .querySelectorAll(".delete-product-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteProduct(
            button.dataset.id
          );

        }
      );

    });

}


// =========================================
// DASHBOARD
// =========================================

function updateDashboard() {

  const total =
    products.length;


  const low =
    products.filter(product => {

      const quantity =
        Number(product.quantity || 0);

      const minimum =
        Number(product.minimum || 0);

      return (
        quantity > 0 &&
        quantity <= minimum
      );

    }).length;


  const out =
    products.filter(product => {

      return Number(
        product.quantity || 0
      ) === 0;

    }).length;


  const inStock =
    Math.max(
      total - low - out,
      0
    );


  const value =
    products.reduce(

      (sum, product) => {

        return (
          sum +
          Number(product.price || 0) *
          Number(product.quantity || 0)
        );

      },

      0

    );


  setText(
    "totalProducts",
    total
  );


  setText(
    "lowStock",
    low
  );


  setText(
    "outStock",
    out
  );


  setText(
    "inventoryValue",
    formatCurrency(value)
  );


  setText(
    "reportInventory",
    formatCurrency(value)
  );


  setText(
    "donutTotal",
    total
  );


  setText(
    "inStockCount",
    inStock
  );


  setText(
    "lowStockCount",
    low
  );


  setText(
    "outStockCount",
    out
  );


  const pct = number => {

    return total
      ? `${Math.round(
          number / total * 100
        )}%`
      : "0%";

  };


  setText(
    "inStockPct",
    pct(inStock)
  );


  setText(
    "lowStockPct",
    pct(low)
  );


  setText(
    "outStockPct",
    pct(out)
  );


  const donut =
    document.getElementById(
      "donut"
    );


  if (donut) {

    donut.style.setProperty(
      "--green",
      `${
        total
          ? inStock / total * 100
          : 0
      }%`
    );

  }


  updateLowStockNotice();

}


// =========================================
// DASHBOARD GREETING
// =========================================

function updateDashboardGreeting() {

  const dashboardGreeting =
    document.getElementById(
      "dashboardGreeting"
    );


  if (!dashboardGreeting) {
    return;
  }


  const savedName =
    localStorage.getItem(
      "stocklyProfileName"
    );


  const cleanName =
    savedName
      ? savedName.trim()
      : "";


  const firstName =
    cleanName
      ? cleanName.split(/\s+/)[0]
      : "User";


  const hour =
    new Date().getHours();


  let greeting =
    "Good morning";


  if (
    hour >= 12 &&
    hour < 18
  ) {

    greeting =
      "Good afternoon";

  }


  if (hour >= 18) {

    greeting =
      "Good evening";

  }


  dashboardGreeting.textContent =
    `${greeting}, ${firstName}!`;

}


// =========================================
// DYNAMIC CURRENT DATE & TIME
// =========================================

function updateDateTime() {

  const currentDate =
    document.getElementById(
      "currentDate"
    );


  const currentTime =
    document.getElementById(
      "currentTime"
    );


  const now =
    new Date();


  if (currentDate) {

    currentDate.textContent =
      now.toLocaleDateString(
        "en-PH",
        {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        }
      );

  }


  if (currentTime) {

    currentTime.textContent =
      now.toLocaleTimeString(
        "en-PH",
        {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }
      );

  }

}


// =========================================
// LOW STOCK NOTICE
// =========================================

function updateLowStockNotice() {

  const enabled =
    localStorage.getItem(
      "stocklyLowStockAlerts"
    ) !== "false";


  if (!enabled) {
    return;
  }


  const lowProducts =
    products.filter(product => {

      const quantity =
        Number(product.quantity || 0);

      const minimum =
        Number(product.minimum || 0);

      return (
        quantity > 0 &&
        quantity <= minimum
      );

    });


  if (!lowProducts.length) {
    return;
  }

}


// =========================================
// DASHBOARD RECENT TRANSACTIONS
// =========================================

async function loadDashboardTransactions() {

  const container =
    document.getElementById(
      "dashboardTransactions"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div>
      Loading recent transactions...
    </div>
  `;


  try {

    const res =
      await fetch(
        `${API}/api/transactions`
      );


    if (!res.ok) {

      throw new Error(
        `Server error: ${res.status}`
      );

    }


    const data =
      await res.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "Unable to load transactions."
      );

    }


    const transactions =
      Array.isArray(data.transactions)
        ? data.transactions
        : [];


    const recent =
      transactions.slice(0, 3);


    if (!recent.length) {

      container.innerHTML = `
        <div>
          No recent transactions.
        </div>
      `;

      return;

    }


    container.innerHTML =
      recent
        .map(transaction => {

          const isStockIn =
            transaction.type ===
            "Stock In";


          return `
            <div>

              <span
                class="${
                  isStockIn
                    ? "green-text"
                    : "red-text"
                }"
              >
                ${isStockIn ? "↑" : "↓"}
              </span>


              <span>

                ${escapeHtml(
                  transaction.type || ""
                )}

                ·

                ${escapeHtml(
                  transaction.productName || ""
                )}

                <small>
                  ${formatTransactionDate(
                    transaction.createdAt
                  )}
                </small>

              </span>


              <b
                class="${
                  isStockIn
                    ? "green-text"
                    : "red-text"
                }"
              >

                ${
                  isStockIn
                    ? "+"
                    : "-"
                }${Number(
                  transaction.quantity || 0
                )} pcs

              </b>

            </div>
          `;

        })
        .join("");


  } catch (err) {

    console.error(
      "Dashboard transactions loading error:",
      err
    );


    container.innerHTML = `
      <div>
        Unable to load recent transactions.
      </div>
    `;

  }

}


// =========================================
// ADD PRODUCT
// =========================================

function setupProductForm() {

  const form =
    document.getElementById(
      "productForm"
    );


  if (!form) return;


  form.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const f =
        new FormData(form);


      const name =
        String(
          f.get("name") || ""
        ).trim();


      const category =
        String(
          f.get("category") || ""
        ).trim();


      const price =
        Number(
          f.get("price")
        );


      const quantity =
        Number(
          f.get("quantity")
        );


      const minimum =
        Number(
          f.get("minimum")
        );


      if (!name) {

        alert(
          "Please enter the product name."
        );

        return;

      }


      if (!category) {

        alert(
          "Please enter the category."
        );

        return;

      }


      if (
        !Number.isFinite(price) ||
        price < 0
      ) {

        alert(
          "Please enter a valid price."
        );

        return;

      }


      if (
        !Number.isFinite(quantity) ||
        quantity < 0
      ) {

        alert(
          "Please enter a valid quantity."
        );

        return;

      }


      if (
        !Number.isFinite(minimum) ||
        minimum < 0
      ) {

        alert(
          "Please enter a valid minimum stock."
        );

        return;

      }


      const payload = {

        name,

        category,

        price,

        quantity,

        minimum

      };


      try {

        const res =
          await fetch(
            `${API}/api/products`,
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  payload
                )

            }
          );


        const data =
          await res.json();


        if (
          !res.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
            "Unable to save product."
          );

        }


        alert(
          "Product saved successfully."
        );


        form.reset();


        await loadProducts();


        showPage("products");


      } catch (err) {

        console.error(
          "Add product error:",
          err
        );

        alert(
          err.message ||
          "Unable to save product."
        );

      }

    }
  );

}


// =========================================
// EDIT PRODUCT
// =========================================

function setupEditProduct() {

  const form =
    document.getElementById(
      "editProductForm"
    );


  const cancelBtn =
    document.getElementById(
      "cancelEditProduct"
    );


  const closeBtn =
    document.getElementById(
      "closeEditProduct"
    );


  const modal =
    document.getElementById(
      "editProductModal"
    );


  if (!form || !modal) {
    return;
  }


  cancelBtn?.addEventListener(
    "click",
    () => {

      closeEditProduct();

    }
  );


  closeBtn?.addEventListener(
    "click",
    () => {

      closeEditProduct();

    }
  );


  modal.addEventListener(
    "click",
    e => {

      if (
        e.target === modal
      ) {

        closeEditProduct();

      }

    }
  );


  form.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      if (!editingProductId) {
        return;
      }


      const f =
        new FormData(form);


      const name =
        String(
          f.get("name") || ""
        ).trim();


      const category =
        String(
          f.get("category") || ""
        ).trim();


      const price =
        Number(
          f.get("price")
        );


      const quantity =
        Number(
          f.get("quantity")
        );


      const minimum =
        Number(
          f.get("minimum")
        );


      if (!name) {

        alert(
          "Please enter the product name."
        );

        return;

      }


      if (!category) {

        alert(
          "Please enter the category."
        );

        return;

      }


      if (
        !Number.isFinite(price) ||
        price < 0
      ) {

        alert(
          "Please enter a valid price."
        );

        return;

      }


      if (
        !Number.isFinite(quantity) ||
        quantity < 0
      ) {

        alert(
          "Please enter a valid quantity."
        );

        return;

      }


      if (
        !Number.isFinite(minimum) ||
        minimum < 0
      ) {

        alert(
          "Please enter a valid minimum stock."
        );

        return;

      }


      const payload = {

        name,

        category,

        price,

        quantity,

        minimum

      };


      try {

        const res =
          await fetch(
            `${API}/api/products/${editingProductId}`,
            {

              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  payload
                )

            }
          );


        const data =
          await res.json();


        if (
          !res.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
            "Unable to update product."
          );

        }


        alert(
          "Product updated successfully."
        );


        closeEditProduct();


        await loadProducts();


      } catch (err) {

        console.error(
          "Edit product error:",
          err
        );

        alert(
          err.message ||
          "Unable to update product."
        );

      }

    }

  );

}


// =========================================
// OPEN EDIT MODAL
// =========================================

function openEditProduct(id) {

  const product =
    products.find(
      p =>
        String(p.id) ===
        String(id)
    );


  if (!product) {

    alert(
      "Product not found."
    );

    return;

  }


  editingProductId = id;


  const modal =
    document.getElementById(
      "editProductModal"
    );


  const name =
    document.getElementById(
      "editProductName"
    );


  const category =
    document.getElementById(
      "editProductCategory"
    );


  const price =
    document.getElementById(
      "editProductPrice"
    );


  const quantity =
    document.getElementById(
      "editProductQuantity"
    );


  const minimum =
    document.getElementById(
      "editProductMinimum"
    );


  if (!modal) {
    return;
  }


  if (name) {
    name.value =
      product.name || "";
  }


  if (category) {
    category.value =
      product.category || "";
  }


  if (price) {
    price.value =
      product.price ?? "";
  }


  if (quantity) {
    quantity.value =
      product.quantity ?? "";
  }


  if (minimum) {
    minimum.value =
      product.minimum ?? "";
  }


  modal.classList.add(
    "open"
  );


  name?.focus();

}


// =========================================
// CLOSE EDIT MODAL
// =========================================

function closeEditProduct() {

  const modal =
    document.getElementById(
      "editProductModal"
    );


  const form =
    document.getElementById(
      "editProductForm"
    );


  editingProductId =
    null;


  if (form) {

    form.reset();

  }


  if (modal) {

    modal.classList.remove(
      "open"
    );

  }

}


// =========================================
// DELETE PRODUCT
// =========================================

async function deleteProduct(id) {

  const product =
    products.find(
      p =>
        String(p.id) ===
        String(id)
    );


  if (!product) {

    alert(
      "Product not found."
    );

    return;

  }


  const deleteConfirmation =
    localStorage.getItem(
      "stocklyDeleteConfirmation"
    );


  if (
    deleteConfirmation !==
    "false"
  ) {

    const confirmed =
      confirm(
        `Are you sure you want to delete "${product.name}"?`
      );


    if (!confirmed) {
      return;
    }

  }


  try {

    const res =
      await fetch(
        `${API}/api/products/${id}`,
        {
          method: "DELETE"
        }
      );


    const data =
      await res.json();


    if (
      !res.ok ||
      !data.success
    ) {

      throw new Error(
        data.message ||
        "Unable to delete product."
      );

    }


    alert(
      "Product deleted successfully."
    );


    await loadProducts();


  } catch (err) {

    console.error(
      "Delete product error:",
      err
    );

    alert(
      err.message ||
      "Unable to delete product."
    );

  }

}


// =========================================
// CATEGORY FILTER
// =========================================

function setupCategoryFilter() {

  const categorySelect =
    document.querySelector(
      "#page-products .filters select:nth-of-type(1)"
    );


  if (!categorySelect) {
    return;
  }


  const currentValue =
    categorySelect.value;


  const categories = [
    ...new Set(

      products
        .map(
          product =>
            String(
              product.category || ""
            ).trim()
        )
        .filter(
          category =>
            category
        )

    )
  ].sort();


  categorySelect.innerHTML = `

    <option value="All Categories">
      All Categories
    </option>

    ${categories
      .map(
        category => `

          <option
            value="${escapeHtml(category)}"
          >
            ${escapeHtml(category)}
          </option>

        `
      )
      .join("")}

  `;


  if (
    categories.includes(
      currentValue
    )
  ) {

    categorySelect.value =
      currentValue;

  } else {

    categorySelect.value =
      "All Categories";

  }

}


// =========================================
// CATEGORIES
// =========================================

function renderCategories() {

  const container =
    document.getElementById(
      "categoriesContainer"
    );


  if (!container) {
    return;
  }


  if (!products.length) {

    container.innerHTML = `

      <div class="panel empty-state">

        No categories available yet.

        <br>

        Add a product to create a category.

      </div>

    `;

    return;

  }


  const categoryMap = {};


  products.forEach(product => {

    const category =
      String(
        product.category ||
        "Uncategorized"
      ).trim();


    if (!categoryMap[category]) {

      categoryMap[category] = {

        products: 0,

        units: 0,

        value: 0

      };

    }


    categoryMap[category].products += 1;


    categoryMap[category].units +=
      Number(
        product.quantity || 0
      );


    categoryMap[category].value +=
      Number(
        product.price || 0
      ) *
      Number(
        product.quantity || 0
      );

  });


  const categories =
    Object.entries(
      categoryMap
    ).sort(
      (
        a,
        b
      ) =>
        b[1].units -
        a[1].units
    );


  container.innerHTML =
    categories
      .map(
        (
          [
            category,
            data
          ]
        ) => `

          <div class="panel">

            <b>
              ${escapeHtml(
                category
              )}
            </b>

            <strong>
              ${data.products}
              ${
                data.products === 1
                  ? "item"
                  : "items"
              }
            </strong>

            <small
              style="
                display:block;
                margin-top:8px;
              "
            >
              ${data.units} pcs in stock
            </small>

            <small
              style="
                display:block;
                margin-top:4px;
              "
            >
              Value:
              ${formatCurrency(
                data.value
              )}
            </small>

          </div>

        `
      )
      .join("");

}


// =========================================
// SEARCH + FILTER
// =========================================

function filterProducts() {

  const globalSearch =
    document.getElementById(
      "globalSearch"
    );


  const productSearch =
    document.getElementById(
      "productSearch"
    );


  const categorySelect =
    document.querySelector(
      "#page-products .filters select:nth-of-type(1)"
    );


  const statusSelect =
    document.querySelector(
      "#page-products .filters select:nth-of-type(2)"
    );


  const globalTerm =
    globalSearch
      ?.value
      .trim()
      .toLowerCase() || "";


  const productTerm =
    productSearch
      ?.value
      .trim()
      .toLowerCase() || "";


  const category =
    categorySelect?.value ||
    "All Categories";


  const status =
    statusSelect?.value ||
    "All Status";


  const searchTerm =
    productTerm ||
    globalTerm;


  const filtered =
    products.filter(
      product => {

        const matchesSearch =
          !searchTerm ||

          String(
            product.name || ""
          )
            .toLowerCase()
            .includes(searchTerm) ||

          String(
            product.category || ""
          )
            .toLowerCase()
            .includes(searchTerm);


        const matchesCategory =
          category ===
            "All Categories" ||

          product.category ===
            category;


        const [
          productStatus
        ] = statusOf(
          product
        );


        const matchesStatus =
          status ===
            "All Status" ||

          productStatus ===
            status;


        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus
        );

      }
    );


  renderProducts(
    filtered
  );

}


// =========================================
// TRANSACTION FILTERS
// =========================================

function setupTransactionFilters() {

  const typeFilter =
    document.getElementById(
      "transactionTypeFilter"
    );


  const startDateFilter =
    document.getElementById(
      "transactionStartDate"
    );


  const endDateFilter =
    document.getElementById(
      "transactionEndDate"
    );


  typeFilter?.addEventListener(
    "change",
    renderFilteredTransactions
  );


  startDateFilter?.addEventListener(
    "change",
    renderFilteredTransactions
  );


  endDateFilter?.addEventListener(
    "change",
    renderFilteredTransactions
  );

}


// =========================================
// FILTER TRANSACTIONS
// =========================================

function renderFilteredTransactions() {

  const typeFilter =
    document.getElementById(
      "transactionTypeFilter"
    );


  const startDateFilter =
    document.getElementById(
      "transactionStartDate"
    );


  const endDateFilter =
    document.getElementById(
      "transactionEndDate"
    );


  const selectedType =
    typeFilter?.value ||
    "All Types";


  const startDateValue =
    startDateFilter?.value ||
    "";


  const endDateValue =
    endDateFilter?.value ||
    "";


  if (
    startDateValue &&
    endDateValue &&
    startDateValue > endDateValue
  ) {

    filteredTransactions = [];


    const body =
      document.getElementById(
        "transactionsBody"
      );


    if (body) {

      body.innerHTML = `

        <tr>

          <td
            colspan="7"
            class="empty-table"
          >
            Start date cannot be after end date.
          </td>

        </tr>

      `;

    }


    return;

  }


  const startDate =
    startDateValue
      ? new Date(
          `${startDateValue}T00:00:00`
        )
      : null;


  const endDate =
    endDateValue
      ? new Date(
          `${endDateValue}T23:59:59.999`
        )
      : null;


  const filtered =
    allTransactions.filter(
      transaction => {

        if (
          selectedType !== "All Types" &&
          transaction.type !== selectedType
        ) {

          return false;

        }


        const transactionDate =
          getTransactionDate(
            transaction.createdAt
          );


        if (
          !startDate &&
          !endDate
        ) {

          return true;

        }


        if (!transactionDate) {

          return false;

        }


        if (
          startDate &&
          transactionDate < startDate
        ) {

          return false;

        }


        if (
          endDate &&
          transactionDate > endDate
        ) {

          return false;

        }


        return true;

      }
    );


  filteredTransactions =
    filtered;


  renderTransactions(
    filtered
  );

}


// =========================================
// GET TRANSACTION DATE
// =========================================

function getTransactionDate(
  value
) {

  try {

    if (!value) {

      return null;

    }


    if (
      typeof value === "object" &&
      value.seconds !== undefined
    ) {

      return new Date(
        Number(value.seconds) * 1000
      );

    }


    if (
      typeof value === "object" &&
      value._seconds !== undefined
    ) {

      return new Date(
        Number(value._seconds) * 1000
      );

    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return null;

    }


    return date;


  } catch {

    return null;

  }

}


// =========================================
// LOAD TRANSACTIONS
// =========================================

async function loadTransactions() {

  const body =
    document.getElementById(
      "transactionsBody"
    );


  if (!body) {

    return;

  }


  body.innerHTML = `

    <tr>

      <td
        colspan="7"
        class="empty-table"
      >
        Loading transactions...
      </td>

    </tr>

  `;


  try {

    const res =
      await fetch(
        `${API}/api/transactions`
      );


    if (!res.ok) {

      throw new Error(
        `Server error: ${res.status}`
      );

    }


    const data =
      await res.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "Unable to load transactions."
      );

    }


    allTransactions =
      Array.isArray(data.transactions)
        ? data.transactions
        : [];


    renderFilteredTransactions();


  } catch (err) {

    console.error(
      "Transactions loading error:",
      err
    );


    allTransactions = [];

    filteredTransactions = [];


    body.innerHTML = `

      <tr>

        <td
          colspan="7"
          class="empty-table"
        >
          Unable to load transactions.
        </td>

      </tr>

    `;

  }

}


// =========================================
// RENDER TRANSACTIONS
// =========================================

function renderTransactions(
  transactions
) {

  const body =
    document.getElementById(
      "transactionsBody"
    );


  if (!body) {

    return;

  }


  if (
    !transactions.length
  ) {

    body.innerHTML = `

      <tr>

        <td
          colspan="7"
          class="empty-table"
        >
          No transactions available.
        </td>

      </tr>

    `;

    return;

  }


  body.innerHTML =
    transactions
      .map(
        transaction => {

          const isStockIn =
            transaction.type ===
            "Stock In";


          return `

            <tr>

              <td>
                ${formatTransactionDate(
                  transaction.createdAt
                )}
              </td>


              <td>

                <span
                  class="tag ${
                    isStockIn
                      ? "green"
                      : "red"
                  }"
                >
                  ${escapeHtml(
                    transaction.type || ""
                  )}
                </span>

              </td>


              <td>
                ${escapeHtml(
                  transaction.productName || ""
                )}
              </td>


              <td
                class="${
                  isStockIn
                    ? "green-text"
                    : "red-text"
                }"
              >

                ${
                  isStockIn
                    ? "+"
                    : "-"
                }${Number(
                  transaction.quantity || 0
                )}

              </td>


              <td>
                ${Number(
                  transaction.previousStock || 0
                )}
              </td>


              <td>
                ${Number(
                  transaction.newStock || 0
                )}
              </td>


              <td>
                ${escapeHtml(
                  transaction.remarks ||
                  ""
                )}
              </td>

            </tr>

          `;

        }
      )
      .join("");

}


// =========================================
// REPORTS
// =========================================

async function loadReports() {

  try {

    const res =
      await fetch(
        `${API}/api/transactions`
      );


    if (!res.ok) {

      throw new Error(
        `Server error: ${res.status}`
      );

    }


    const data =
      await res.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "Unable to load report data."
      );

    }


    const transactions =
      Array.isArray(data.transactions)
        ? data.transactions
        : [];


    updateReportSummary(
      transactions
    );


    renderStockMovement(
      transactions
    );


    renderTopCategories();


    renderCategorySummary();


  } catch (err) {

    console.error(
      "Reports loading error:",
      err
    );


    setText(
      "reportProducts",
      products.length
    );


    setText(
      "reportStockIn",
      "0 pcs"
    );


    setText(
      "reportStockOut",
      "0 pcs"
    );


    setText(
      "reportInventory",
      formatCurrency(0)
    );


    const chart =
      document.getElementById(
        "stockMovementChart"
      );


    if (chart) {

      chart.innerHTML = `
        <div>
          Unable to load stock movement.
        </div>
      `;

    }


    const categoryChart =
      document.getElementById(
        "topCategoriesChart"
      );


    if (categoryChart) {

      categoryChart.innerHTML = `
        <span>0</span>
        <small>Total Products</small>
      `;

    }

  }

}


// =========================================
// REPORT SUMMARY
// =========================================

function updateReportSummary(
  transactions
) {

  const totalProducts =
    products.length;


  const stockIn =
    transactions
      .filter(
        transaction =>
          transaction.type ===
          "Stock In"
      )
      .reduce(
        (
          total,
          transaction
        ) =>
          total +
          Number(
            transaction.quantity || 0
          ),
        0
      );


  const stockOut =
    transactions
      .filter(
        transaction =>
          transaction.type ===
          "Stock Out"
      )
      .reduce(
        (
          total,
          transaction
        ) =>
          total +
          Number(
            transaction.quantity || 0
          ),
        0
      );


  const inventoryValue =
    products.reduce(

      (total, product) =>

        total +
        Number(
          product.price || 0
        ) *
        Number(
          product.quantity || 0
        ),

      0

    );


  setText(
    "reportProducts",
    totalProducts
  );


  setText(
    "reportStockIn",
    `${stockIn} pcs`
  );


  setText(
    "reportStockOut",
    `${stockOut} pcs`
  );


  setText(
    "reportInventory",
    formatCurrency(
      inventoryValue
    )
  );

}


// =========================================
// STOCK MOVEMENT REPORT
// =========================================

function renderStockMovement(
  transactions
) {

  const chart =
    document.getElementById(
      "stockMovementChart"
    );


  if (!chart) {
    return;
  }


  const stockIn =
    transactions
      .filter(
        transaction =>
          transaction.type ===
          "Stock In"
      )
      .reduce(
        (
          total,
          transaction
        ) =>
          total +
          Number(
            transaction.quantity || 0
          ),
        0
      );


  const stockOut =
    transactions
      .filter(
        transaction =>
          transaction.type ===
          "Stock Out"
      )
      .reduce(
        (
          total,
          transaction
        ) =>
          total +
          Number(
            transaction.quantity || 0
          ),
        0
      );


  const max =
    Math.max(
      stockIn,
      stockOut,
      1
    );


  const inHeight =
    Math.max(
      8,
      Math.round(
        stockIn / max * 100
      )
    );


  const outHeight =
    Math.max(
      8,
      Math.round(
        stockOut / max * 100
      )
    );


  chart.innerHTML = `

    <div
      style="
        display:flex;
        align-items:flex-end;
        justify-content:center;
        gap:40px;
        height:180px;
        padding:20px 10px 10px;
      "
    >

      <div
        style="
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:flex-end;
          height:100%;
        "
      >

        <b>
          ${stockIn}
        </b>

        <i
          style="
            display:block;
            width:55px;
            height:${inHeight}%;
            min-height:15px;
            border-radius:8px 8px 0 0;
            background:#35b889;
          "
        ></i>

        <small>
          Stock In
        </small>

      </div>


      <div
        style="
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:flex-end;
          height:100%;
        "
      >

        <b>
          ${stockOut}
        </b>

        <i
          style="
            display:block;
            width:55px;
            height:${outHeight}%;
            min-height:15px;
            border-radius:8px 8px 0 0;
            background:#e86a8b;
          "
        ></i>

        <small>
          Stock Out
        </small>

      </div>

    </div>

  `;

}


// =========================================
// TOP CATEGORIES
// =========================================

function renderTopCategories() {

  const chart =
    document.getElementById(
      "topCategoriesChart"
    );


  if (!chart) {
    return;
  }


  const categoryMap = {};


  products.forEach(product => {

    const category =
      String(
        product.category ||
        "Uncategorized"
      ).trim();


    categoryMap[category] =
      (categoryMap[category] || 0) +
      Number(
        product.quantity || 0
      );

  });


  const categories =
    Object.entries(
      categoryMap
    )
      .sort(
        (
          a,
          b
        ) =>
          b[1] - a[1]
      );


  const totalProducts =
    products.length;


  if (!categories.length) {

    chart.innerHTML = `
      <span>0</span>
      <small>Total Products</small>
    `;

    return;

  }


  const topCategory =
    categories[0][0];


  const topQuantity =
    categories[0][1];


  chart.innerHTML = `

    <span>
      ${topQuantity}
    </span>

    <small>
      Top: ${escapeHtml(
        topCategory
      )}
    </small>

    <small>
      ${totalProducts} products
    </small>

  `;

}


// =========================================
// CATEGORY SUMMARY
// =========================================

function renderCategorySummary() {

  const container =
    document.getElementById(
      "reportCategories"
    );


  if (!container) {
    return;
  }


  const categoryMap = {};


  products.forEach(product => {

    const category =
      String(
        product.category ||
        "Uncategorized"
      ).trim();


    if (!categoryMap[category]) {

      categoryMap[category] = {
        products: 0,
        units: 0,
        value: 0
      };

    }


    categoryMap[category].products += 1;


    categoryMap[category].units +=
      Number(
        product.quantity || 0
      );


    categoryMap[category].value +=

      Number(
        product.price || 0
      ) *
      Number(
        product.quantity || 0
      );

  });


  const categories =
    Object.entries(
      categoryMap
    )
      .sort(
        (
          a,
          b
        ) =>
          b[1].units -
          a[1].units
      );


  if (!categories.length) {

    container.innerHTML = `
      <div>
        No categories available.
      </div>
    `;

    return;

  }


  container.innerHTML =
    categories
      .map(
        (
          [
            category,
            data
          ]
        ) => `

          <div
            style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:20px;
              padding:14px 0;
              border-bottom:1px solid #e7ebf2;
            "
          >

            <div>

              <b>
                ${escapeHtml(
                  category
                )}
              </b>

              <small
                style="
                  display:block;
                  margin-top:4px;
                "
              >
                ${data.products}
                product${
                  data.products === 1
                    ? ""
                    : "s"
                }
                ·
                ${data.units} pcs
              </small>

            </div>


            <strong>
              ${formatCurrency(
                data.value
              )}
            </strong>

          </div>

        `
      )
      .join("");

}


// =========================================
// REPORT EXPORT
// =========================================

function setupReportExport() {

  document
    .getElementById("exportReportBtn")
    ?.addEventListener(
      "click",
      exportReport
    );


  document
    .getElementById("exportTransactionsBtn")
    ?.addEventListener(
      "click",
      exportTransactions
    );

}


// =========================================
// EXPORT REPORT
// =========================================

function exportReport() {

  try {

    const reportProducts =
      products.length;


    const stockInElement =
      document.getElementById(
        "reportStockIn"
      );


    const stockOutElement =
      document.getElementById(
        "reportStockOut"
      );


    const inventoryElement =
      document.getElementById(
        "reportInventory"
      );


    const stockIn =
      stockInElement
        ? stockInElement.textContent
        : "0 pcs";


    const stockOut =
      stockOutElement
        ? stockOutElement.textContent
        : "0 pcs";


    const inventoryValue =
      inventoryElement
        ? inventoryElement.textContent
        : formatCurrency(0);


    const rows =
      products
        .map(product => {

          const [
            status
          ] = statusOf(
            product
          );


          const value =
            Number(
              product.price || 0
            ) *
            Number(
              product.quantity || 0
            );


          return `

            <tr>

              <td>
                ${escapeHtml(
                  product.name || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  product.category || ""
                )}
              </td>

              <td>
                ${formatCurrency(
                  product.price
                )}
              </td>

              <td>
                ${Number(
                  product.quantity || 0
                )}
              </td>

              <td>
                ${status}
              </td>

              <td>
                ${formatCurrency(
                  value
                )}
              </td>

            </tr>

          `;

        })
        .join("");


    const printWindow =
      window.open(
        "",
        "_blank"
      );


    if (!printWindow) {

      alert(
        "Please allow pop-ups in your browser to export the report."
      );

      return;

    }


    printWindow.document.write(`

      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="UTF-8">

        <title>
          Stockly Inventory Report
        </title>

        <style>

          body {
            font-family:
              Arial,
              sans-serif;
            padding:
              30px;
            color:
              #263238;
          }

          h1 {
            margin-bottom:
              5px;
          }

          .date {
            color:
              #777;
            margin-bottom:
              25px;
          }

          .summary {
            display:
              grid;
            grid-template-columns:
              repeat(4, 1fr);
            gap:
              15px;
            margin-bottom:
              30px;
          }

          .summary-box {
            border:
              1px solid #ddd;
            padding:
              15px;
            border-radius:
              8px;
          }

          .summary-box b {
            display:
              block;
            font-size:
              22px;
            margin-top:
              5px;
          }

          table {
            width:
              100%;
            border-collapse:
              collapse;
          }

          th,
          td {
            border:
              1px solid #ddd;
            padding:
              10px;
            text-align:
              left;
          }

          th {
            background:
              #f3f5f8;
          }

          .footer {
            margin-top:
              30px;
            font-size:
              12px;
            color:
              #777;
          }

          @media print {

            body {
              padding:
                10px;
            }

          }

        </style>

      </head>


      <body>

        <h1>
          Stockly Inventory Report
        </h1>


        <div class="date">

          Generated:
          ${new Date().toLocaleString()}

        </div>


        <div class="summary">

          <div class="summary-box">

            Total Products

            <b>
              ${reportProducts}
            </b>

          </div>


          <div class="summary-box">

            Stock In

            <b>
              ${escapeHtml(
                stockIn
              )}
            </b>

          </div>


          <div class="summary-box">

            Stock Out

            <b>
              ${escapeHtml(
                stockOut
              )}
            </b>

          </div>


          <div class="summary-box">

            Inventory Value

            <b>
              ${escapeHtml(
                inventoryValue
              )}
            </b>

          </div>

        </div>


        <h2>
          Product Inventory
        </h2>


        <table>

          <thead>

            <tr>

              <th>
                Product
              </th>

              <th>
                Category
              </th>

              <th>
                Price
              </th>

              <th>
                Quantity
              </th>

              <th>
                Status
              </th>

              <th>
                Total Value
              </th>

            </tr>

          </thead>


          <tbody>

            ${
              rows ||
              `
                <tr>

                  <td colspan="6">
                    No products available.
                  </td>

                </tr>
              `
            }

          </tbody>

        </table>


        <div class="footer">

          Stockly | MiniInventory

        </div>


      </body>

      </html>

    `);


    printWindow.document.close();


    printWindow.focus();


    setTimeout(
      () => {

        printWindow.print();

      },
      500
    );


  } catch (err) {

    console.error(
      "Report export error:",
      err
    );


    alert(
      "Unable to export the report."
    );

  }

}


// =========================================
// EXPORT TRANSACTIONS
// =========================================

function exportTransactions() {

  try {

    const transactionsToExport =
      filteredTransactions.length
        ? filteredTransactions
        : allTransactions;


    if (!transactionsToExport.length) {

      alert(
        "There are no transactions to export."
      );

      return;

    }


    const rows =
      transactionsToExport
        .map(transaction => {

          const isStockIn =
            transaction.type ===
            "Stock In";


          return `

            <tr>

              <td>
                ${escapeHtml(
                  formatTransactionDate(
                    transaction.createdAt
                  )
                )}
              </td>


              <td>
                ${escapeHtml(
                  transaction.type || ""
                )}
              </td>


              <td>
                ${escapeHtml(
                  transaction.productName || ""
                )}
              </td>


              <td>
                ${
                  isStockIn
                    ? "+"
                    : "-"
                }${Number(
                  transaction.quantity || 0
                )}
              </td>


              <td>
                ${Number(
                  transaction.previousStock || 0
                )}
              </td>


              <td>
                ${Number(
                  transaction.newStock || 0
                )}
              </td>


              <td>
                ${escapeHtml(
                  transaction.remarks || ""
                )}
              </td>

            </tr>

          `;

        })
        .join("");


    const exportWindow =
      window.open(
        "",
        "_blank"
      );


    if (!exportWindow) {

      alert(
        "Please allow pop-ups in your browser to export the transactions."
      );

      return;

    }


    exportWindow.document.write(`

      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="UTF-8">

        <title>
          Stockly Transactions Report
        </title>

        <style>

          body {
            font-family:
              Arial,
              sans-serif;
            padding:
              30px;
            color:
              #263238;
          }

          h1 {
            margin-bottom:
              5px;
          }

          .date {
            color:
              #777;
            margin-bottom:
              25px;
          }

          table {
            width:
              100%;
            border-collapse:
              collapse;
          }

          th,
          td {
            border:
              1px solid #ddd;
            padding:
              10px;
            text-align:
              left;
          }

          th {
            background:
              #f3f5f8;
          }

          .footer {
            margin-top:
              30px;
            font-size:
              12px;
            color:
              #777;
          }

          @media print {

            body {
              padding:
                10px;
            }

          }

        </style>

      </head>


      <body>

        <h1>
          Stockly Transactions Report
        </h1>


        <div class="date">

          Generated:
          ${new Date().toLocaleString()}

        </div>


        <table>

          <thead>

            <tr>

              <th>
                Date & Time
              </th>

              <th>
                Type
              </th>

              <th>
                Product
              </th>

              <th>
                Quantity
              </th>

              <th>
                Previous Stock
              </th>

              <th>
                New Stock
              </th>

              <th>
                Remarks
              </th>

            </tr>

          </thead>


          <tbody>

            ${rows}

          </tbody>

        </table>


        <div class="footer">

          Stockly | MiniInventory

        </div>


      </body>

      </html>

    `);


    exportWindow.document.close();


    exportWindow.focus();


    setTimeout(
      () => {

        exportWindow.print();

      },
      500
    );


  } catch (err) {

    console.error(
      "Transaction export error:",
      err
    );


    alert(
      "Unable to export transactions."
    );

  }

}


// =========================================
// SETTINGS
// =========================================

function setupSettings() {

  const tabs =
    document.querySelectorAll(
      ".settings-tab"
    );


  tabs.forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        const target =
          tab.dataset.settingsTab;


        tabs.forEach(item => {

          item.classList.remove(
            "active"
          );

        });


        tab.classList.add(
          "active"
        );


        document
          .querySelectorAll(
            ".settings-section"
          )
          .forEach(section => {

            section.classList.remove(
              "active"
            );

          });


        const section =
          document.getElementById(
            `settings-${target}`
          );


        if (section) {

          section.classList.add(
            "active"
          );

        }

      }
    );

  });


  document
    .getElementById("editProfileBtn")
    ?.addEventListener(
      "click",
      () => {

        const input =
          document.getElementById(
            "settingsFullName"
          );


        input?.focus();

        input?.select();

      }
    );


  document
    .getElementById("saveProfileBtn")
    ?.addEventListener(
      "click",
      saveProfile
    );


  document
    .getElementById("cancelProfileBtn")
    ?.addEventListener(
      "click",
      loadSettings
    );


  document
    .getElementById("changePasswordBtn")
    ?.addEventListener(
      "click",
      () => {

        alert(
          "Password management will be connected when the Stockly account authentication system is added."
        );

      }
    );


  document
    .getElementById("addUserBtn")
    ?.addEventListener(
      "click",
      () => {

        alert(
          "User management will be connected when the Stockly account authentication system is added."
        );

      }
    );


  document
    .getElementById("saveSystemSettingsBtn")
    ?.addEventListener(
      "click",
      saveSystemSettings
    );


  document
    .getElementById("backupDataBtn")
    ?.addEventListener(
      "click",
      backupData
    );


  loadSettings();

}


// =========================================
// LOAD SETTINGS
// =========================================

function loadSettings() {

  const savedName =
    localStorage.getItem(
      "stocklyProfileName"
    ) ||
    "User";


  const savedRole =
    localStorage.getItem(
      "stocklyProfileRole"
    ) ||
    "Administrator";


  const savedCurrency =
    localStorage.getItem(
      "stocklyCurrency"
    ) ||
    "PHP";


  const savedLowStock =
    localStorage.getItem(
      "stocklyLowStockAlerts"
    );


  const savedDeleteConfirmation =
    localStorage.getItem(
      "stocklyDeleteConfirmation"
    );


  // PROFILE INPUTS

  const nameInput =
    document.getElementById(
      "settingsFullName"
    );


  const roleInput =
    document.getElementById(
      "settingsRole"
    );


  if (nameInput) {

    nameInput.value =
      savedName;

  }


  if (roleInput) {

    roleInput.value =
      savedRole;

  }


  // PROFILE DISPLAY

  setText(
    "settingsProfileName",
    savedName
  );


  setText(
    "settingsProfileRole",
    savedRole
  );


  // SIDEBAR

  setText(
    "sidebarUserName",
    savedName
  );


  setText(
    "sidebarUserRole",
    savedRole === "Administrator"
      ? "Admin"
      : savedRole
  );


  // AVATARS

  const initials =
    getInitials(
      savedName
    );


  setText(
    "settingsAvatar",
    initials
  );


  setText(
    "sidebarAvatar",
    initials
  );


  setText(
    "topbarAvatar",
    initials
  );


  // DASHBOARD GREETING

  updateDashboardGreeting();


  // SYSTEM SETTINGS

  const currency =
    document.getElementById(
      "currencySetting"
    );


  if (currency) {

    currency.value =
      savedCurrency;

  }


  const lowStock =
    document.getElementById(
      "lowStockAlertSetting"
    );


  if (lowStock) {

    lowStock.checked =
      savedLowStock !== "false";

  }


  const deleteConfirmation =
    document.getElementById(
      "deleteConfirmationSetting"
    );


  if (deleteConfirmation) {

    deleteConfirmation.checked =
      savedDeleteConfirmation !==
      "false";

  }


  updateDashboard();


  if (
    document
      .getElementById("page-products")
      ?.classList
      .contains("active-page")
  ) {

    filterProducts();

  }


  renderCategories();

}


// =========================================
// SAVE PROFILE
// =========================================

function saveProfile() {

  const nameInput =
    document.getElementById(
      "settingsFullName"
    );


  const roleInput =
    document.getElementById(
      "settingsRole"
    );


  if (!nameInput || !roleInput) {

    return;

  }


  const name =
    nameInput.value.trim();


  const role =
    roleInput.value.trim();


  if (!name) {

    alert(
      "Please enter your full name."
    );

    nameInput.focus();

    return;

  }


  if (!role) {

    alert(
      "Please enter your role."
    );

    roleInput.focus();

    return;

  }


  localStorage.setItem(
    "stocklyProfileName",
    name
  );


  localStorage.setItem(
    "stocklyProfileRole",
    role
  );


  loadSettings();


  alert(
    "Profile updated successfully."
  );

}


// =========================================
// SAVE SYSTEM SETTINGS
// =========================================

function saveSystemSettings() {

  const currency =
    document.getElementById(
      "currencySetting"
    );


  const lowStock =
    document.getElementById(
      "lowStockAlertSetting"
    );


  const deleteConfirmation =
    document.getElementById(
      "deleteConfirmationSetting"
    );


  if (currency) {

    localStorage.setItem(
      "stocklyCurrency",
      currency.value
    );

  }


  if (lowStock) {

    localStorage.setItem(
      "stocklyLowStockAlerts",
      String(
        lowStock.checked
      )
    );

  }


  if (deleteConfirmation) {

    localStorage.setItem(
      "stocklyDeleteConfirmation",
      String(
        deleteConfirmation.checked
      )
    );

  }


  updateDashboard();

  filterProducts();

  renderCategories();


  alert(
    "System settings saved successfully."
  );

}


// =========================================
// BACKUP DATA
// =========================================

async function backupData() {

  try {

    await loadProducts();


    try {

      const res =
        await fetch(
          `${API}/api/transactions`
        );


      if (res.ok) {

        const data =
          await res.json();


        if (data.success) {

          allTransactions =
            Array.isArray(
              data.transactions
            )
              ? data.transactions
              : [];

        }

      }

    } catch (transactionError) {

      console.warn(
        "Could not refresh transactions before backup:",
        transactionError
      );

    }


    const backup = {

      application:
        "Stockly | MiniInventory",

      version:
        "1.0",

      generatedAt:
        new Date().toISOString(),

      products:
        products,

      transactions:
        allTransactions,

      settings: {

        profileName:
          localStorage.getItem(
            "stocklyProfileName"
          ) ||
          "User",

        profileRole:
          localStorage.getItem(
            "stocklyProfileRole"
          ) ||
          "Administrator",

        currency:
          localStorage.getItem(
            "stocklyCurrency"
          ) ||
          "PHP",

        lowStockAlerts:
          localStorage.getItem(
            "stocklyLowStockAlerts"
          ) !== "false",

        deleteConfirmation:
          localStorage.getItem(
            "stocklyDeleteConfirmation"
          ) !== "false"

      }

    };


    const blob =
      new Blob(
        [
          JSON.stringify(
            backup,
            null,
            2
          )
        ],
        {
          type:
            "application/json"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    const date =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );


    link.href =
      url;


    link.download =
      `stockly-backup-${date}.json`;


    document.body.appendChild(
      link
    );


    link.click();


    document.body.removeChild(
      link
    );


    setTimeout(() => {

      URL.revokeObjectURL(
        url
      );

    }, 1000);


    alert(
      "Backup created successfully."
    );


  } catch (err) {

    console.error(
      "Backup error:",
      err
    );


    alert(
      "Unable to create backup."
    );

  }

}


// =========================================
// GET INITIALS
// =========================================

function getInitials(
  name
) {

  const parts =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (!parts.length) {

    return "US";

  }


  if (parts.length === 1) {

    return parts[0]
      .substring(
        0,
        2
      )
      .toUpperCase();

  }


  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();

}


// =========================================
// TRANSACTION DATE
// =========================================

function formatTransactionDate(
  value
) {

  const date =
    getTransactionDate(value);


  if (!date) {

    return "Recently";

  }


  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  );

}


// =========================================
// CURRENCY
// =========================================

function getCurrency() {

  return (
    localStorage.getItem(
      "stocklyCurrency"
    ) ||
    "PHP"
  );

}


function formatCurrency(
  value
) {

  const amount =
    Number(value || 0);


  const currency =
    getCurrency();


  if (currency === "USD") {

    return (
      "$" +
      amount.toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );

  }


  return (
    "₱" +
    amount.toLocaleString(
      "en-PH",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )
  );

}


// =========================================
// AI ASSISTANT
// =========================================

function setupAI() {

  const launcher =
    document.getElementById(
      "aiLauncher"
    );


  const panel =
    document.getElementById(
      "aiPanel"
    );


  const close =
    document.getElementById(
      "aiClose"
    );


  const form =
    document.getElementById(
      "aiForm"
    );


  const input =
    document.getElementById(
      "aiInput"
    );


  const messages =
    document.getElementById(
      "aiMessages"
    );


  if (
    !launcher ||
    !panel ||
    !close ||
    !form ||
    !input ||
    !messages
  ) {

    return;

  }


  launcher.addEventListener(
    "click",
    () => {

      panel.classList.add(
        "open"
      );

      input.focus();

    }
  );


  close.addEventListener(
    "click",
    () => {

      panel.classList.remove(
        "open"
      );

    }
  );


  form.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const message =
        input.value.trim();


      if (!message) {
        return;
      }


      addBubble(
        message,
        "user"
      );


      input.value = "";


      const loading =
        addBubble(
          "Thinking...",
          "assistant"
        );


      try {

        const res =
          await fetch(
            `${API}/api/ai/chat`,
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  message
                })

            }
          );


        const data =
          await res.json();


        loading.remove();


        if (
          !res.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
            "AI is unavailable."
          );

        }


        addBubble(
          data.reply,
          "assistant"
        );


      } catch (err) {

        loading.remove();


        addBubble(
          "The AI Assistant is temporarily unavailable. Please try again later.",
          "assistant"
        );


        console.error(
          "AI error:",
          err
        );

      }

    }
  );


  function addBubble(
    text,
    type
  ) {

    const div =
      document.createElement(
        "div"
      );


    div.className =
      `bubble ${type}`;


    div.textContent =
      text;


    messages.appendChild(
      div
    );


    messages.scrollTop =
      messages.scrollHeight;


    return div;

  }

}


// =========================================
// HELPERS
// =========================================

function setText(
  id,
  value
) {

  const el =
    document.getElementById(
      id
    );


  if (el) {

    el.textContent =
      value;

  }

}


// =========================================
// PRODUCT ERROR HELPER
// =========================================

function showProductLoadingError() {

  const body =
    document.getElementById(
      "productsBody"
    );


  if (!body) {
    return;
  }


  body.innerHTML = `

    <tr>

      <td
        colspan="7"
        class="empty-table"
      >
        Unable to connect to the Stockly server.
        Please make sure the backend is running.
      </td>

    </tr>

  `;

}


// =========================================
// ESCAPE HTML
// =========================================

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,

    c => ({

      "&": "&amp;",

      "<": "&lt;",

      ">": "&gt;",

      '"': "&quot;",

      "'": "&#039;"

    }[c])

  );

}