/* =============================================
   Kitchen Stories — app.js
   ============================================= */

// ─── INIT DATA AND CONFIG ──────────────────────────────────────────────────────
const API_URL = 'http://localhost:5000/api';

let menuItems = [];
let chefsSpecials = [];
let reviews = [];
let selectedReviewStar = 0;

let currentUser        = null;
let cart               = [];
let allOrders          = [];
let allReservations    = [];
let nextId             = 400;
let updateTargetId     = null;
let currentAdminCat    = "all";
let currentCustomerCat = "all";

async function fetchInitialData() {
  try {
    const [mRes, sRes, rRes] = await Promise.all([
      fetch(`${API_URL}/menu`),
      fetch(`${API_URL}/specials`),
      fetch(`${API_URL}/reviews`)
    ]);
    if(mRes.ok) menuItems = await mRes.json();
    if(sRes.ok) chefsSpecials = await sRes.json();
    if(rRes.ok) reviews = await rRes.json();
    
    renderSpecialsGrid();
    renderRatingSummary();
    renderReviewCards();
    if(currentCustomerCat) renderMenuGrid(currentCustomerCat);
  } catch(e) { console.error("Error fetching initial data", e); }
}

async function fetchAdminData() {
  try {
    const [oRes, rRes] = await Promise.all([
      fetch(`${API_URL}/orders`),
      fetch(`${API_URL}/reservations`)
    ]);
    if(oRes.ok) allOrders = await oRes.json();
    if(rRes.ok) allReservations = await rRes.json();
    renderAdminOrders();
    renderAdminReservations();
  } catch(e) { console.error("Error fetching admin data", e); }
}

// ─── BOOTSTRAP HELPER ────────────────────────────────────────────────────────
function getModal(id) {
  return bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function showLoginForm() {
  document.getElementById("login-fields").classList.remove("d-none");
  document.getElementById("signup-fields").classList.add("d-none");
  document.getElementById("login-modal-desc").textContent = "Sign in to order or reserve a table";
  document.getElementById("login-error").classList.add("d-none");
}

function showSignupForm() {
  document.getElementById("login-fields").classList.add("d-none");
  document.getElementById("signup-fields").classList.remove("d-none");
  document.getElementById("login-modal-desc").textContent = "Create an account to order or reserve a table";
  document.getElementById("login-error").classList.add("d-none");
}

function showLogin() {
  document.getElementById("login-username").value = "";
  document.getElementById("login-password").value = "";
  if (document.getElementById("signup-name")) {
    document.getElementById("signup-name").value = "";
    document.getElementById("signup-username").value = "";
    document.getElementById("signup-password").value = "";
    showLoginForm();
  }
  document.getElementById("login-error").classList.add("d-none");
  getModal("loginModal").show();
}

async function doSignup() {
  const name  = document.getElementById("signup-name").value.trim();
  const uname = document.getElementById("signup-username").value.trim();
  const pwd   = document.getElementById("signup-password").value;
  const err   = document.getElementById("login-error");
  
  if (!name || !uname || !pwd) {
    err.textContent = "Please fill in all fields.";
    err.classList.remove("d-none");
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: uname, password: pwd, name: name })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      getModal("loginModal").hide();
      fetchInitialData();
      showCustomerPage();
      showToast("Account created successfully! 🎉");
    } else {
      err.textContent = data.message || "Failed to create account.";
      err.classList.remove("d-none");
    }
  } catch(e) {
    err.textContent = "Error communicating with server.";
    err.classList.remove("d-none");
  }
}

async function doLogin() {
  const uname = document.getElementById("login-username").value.trim();
  const pwd   = document.getElementById("login-password").value;
  const err   = document.getElementById("login-error");
  
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: uname, password: pwd })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      getModal("loginModal").hide();
      fetchInitialData(); // Refresh data just in case
      if(currentUser.role === 'admin') {
        await fetchAdminData();
        showAdminPage();
      } else {
        showCustomerPage();
      }
    } else {
      err.textContent = data.message || "Invalid username or password.";
      err.classList.remove("d-none");
    }
  } catch(e) {
    err.textContent = "Error communicating with server.";
    err.classList.remove("d-none");
  }
}



function logout() {
  currentUser = null;
  cart = [];
  updateCartBadge();
  showPage("landing-page");
}

// ─── PAGE ROUTING ─────────────────────────────────────────────────────────────
function showPage(id) {
  ["landing-page","customer-page","admin-page"].forEach(p =>
    document.getElementById(p).classList.add("d-none")
  );
  document.getElementById(id).classList.remove("d-none");
}
function showCustomerPage() {
  showPage("customer-page");
  currentCustomerCat = "all";
  document.querySelectorAll("#customer-page .cat-btn").forEach((b,i) =>
    b.classList.toggle("active", i === 0)
  );
  renderMenuGrid("all");
}
function showAdminPage() {
  showPage("admin-page");
  showAdminTab("menu-management");
}

// ─── MENU GRID (customer) ─────────────────────────────────────────────────────
function renderMenuGrid(cat) {
  const grid    = document.getElementById("menu-grid");
  const heading = document.getElementById("category-heading");
  const list    = cat === "all" ? menuItems : menuItems.filter(m => m.category === cat);
  heading.textContent = cat === "all" ? "All Dishes" : cat;
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state col-12"><i class="bi bi-emoji-frown"></i>No dishes in this category yet.</div>`;
    return;
  }
  grid.innerHTML = list.map(item => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="menu-card">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" class="menu-card-img" onerror="this.style.display='none'">`
          : `<div class="menu-card-img-placeholder"><i class="bi bi-bowl-hot"></i></div>`}
        <div class="menu-card-body">
          <div class="d-flex align-items-center gap-1 mb-1">
            <span class="veg-dot ${item.veg}"></span>
            <span class="badge-cat">${item.category}</span>
          </div>
          <div class="menu-card-title">${item.name}</div>
          <div class="menu-card-desc">${item.desc}</div>
          <div class="menu-card-footer">
            <span class="price-tag">₹${item.price}</span>
            <button class="btn btn-warning btn-sm" onclick="addToCart(${item.id})">
              <i class="bi bi-plus-lg"></i> Add
            </button>
          </div>
        </div>
      </div>
    </div>`).join("");
}

function filterCategory(cat, btn) {
  currentCustomerCat = cat;
  document.querySelectorAll("#customer-page .cat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderMenuGrid(cat);
}

// ─── CART ─────────────────────────────────────────────────────────────────────
function addToCart(id) {
  const item = menuItems.find(m => m.id === id);
  if (!item) return;
  const ex = cart.find(c => c.id === id);
  ex ? ex.qty++ : cart.push({ id:item.id, name:item.name, price:item.price, qty:1 });
  updateCartBadge();
  showToast(`${item.name} added to cart!`);
}
function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  const total = cart.reduce((s,c) => s+c.qty, 0);
  badge.textContent = total;
  badge.classList.toggle("d-none", total === 0);
}
function showCart() {
  const body  = document.getElementById("cart-body");
  const total = document.getElementById("cart-total");
  if (!cart.length) {
    body.innerHTML = `<div class="empty-state"><i class="bi bi-cart-x"></i>Your cart is empty.</div>`;
    total.textContent = "";
  } else {
    const grand = cart.reduce((s,c) => s + c.price*c.qty, 0);
    body.innerHTML = cart.map(c => `
      <div class="cart-item-row">
        <span class="cart-item-name">${c.name}</span>
        <div class="d-flex align-items-center gap-1">
          <button class="cart-qty-btn" onclick="changeQty(${c.id},-1)">−</button>
          <span class="cart-qty-val">${c.qty}</span>
          <button class="cart-qty-btn" onclick="changeQty(${c.id},1)">+</button>
        </div>
        <span class="cart-item-price">₹${c.price*c.qty}</span>
        <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${c.id})">
          <i class="bi bi-trash"></i>
        </button>
      </div>`).join("");
    total.textContent = `Grand Total: ₹${grand}`;
  }
  getModal("cartModal").show();
}
function changeQty(id, delta) {
  const i = cart.findIndex(c => c.id === id);
  if (i === -1) return;
  cart[i].qty += delta;
  if (cart[i].qty <= 0) cart.splice(i,1);
  updateCartBadge();
  showCart();
}
function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCartBadge();
  showCart();
}

// ─── PLACE ORDER ──────────────────────────────────────────────────────────────
async function placeOrder() {
  if (!cart.length) return;
  const orderData = {
    orderId:  `ORD-${Date.now()}`,
    username: currentUser.username,
    name:     currentUser.name,
    items:    cart.map(c => ({...c})),
    total:    cart.reduce((s,c) => s + c.price*c.qty, 0),
    status:   "Placed"
  };
  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });
    if (res.ok) {
      orderData.time = new Date().toLocaleString("en-IN");
      allOrders.push(orderData);
      cart = [];
      updateCartBadge();
      getModal("cartModal").hide();
      showToast("Order placed successfully! 🎉");
    } else {
      showToast("Failed to place order.");
    }
  } catch(e) {
    console.error(e);
    showToast("Error communicating with server.");
  }
}

// ─── MY ORDERS (customer) ─────────────────────────────────────────────────────
function showMyOrders() {
  const body     = document.getElementById("orders-body");
  const myOrders = allOrders.filter(o => o.username === currentUser.username);
  if (!myOrders.length) {
    body.innerHTML = `<div class="empty-state"><i class="bi bi-bag-x"></i>You haven't placed any orders yet.</div>`;
  } else {
    body.innerHTML = myOrders.slice().reverse().map(o => `
      <div class="order-card">
        <div class="order-header">
          <div>
            <strong>${o.orderId}</strong>
            <span class="text-muted ms-2" style="font-size:0.82rem;">${o.time}</span>
          </div>
          <span class="order-status status-${o.status.toLowerCase()}">${o.status}</span>
        </div>
        ${o.items.map(i => `
          <div class="order-item-row">
            <span>${i.name} × ${i.qty}</span>
            <span>₹${i.price*i.qty}</span>
          </div>`).join("")}
        <div class="d-flex justify-content-end mt-2"><strong>Total: ₹${o.total}</strong></div>
      </div>`).join("");
  }
  getModal("ordersModal").show();
}

// ─── TABLE RESERVATION (after login) ─────────────────────────────────────────
function openReservation() {
  document.getElementById("res-name").value     = currentUser.name || "";
  document.getElementById("res-phone").value    = "";
  document.getElementById("res-date").value     = "";
  document.getElementById("res-time").value     = "";
  document.getElementById("res-guests").value   = "";
  document.getElementById("res-occasion").value = "";
  document.getElementById("res-seating").value  = "";
  document.getElementById("res-notes").value    = "";
  document.getElementById("res-date").min       = new Date().toISOString().split("T")[0];
  document.getElementById("reservation-success").classList.add("d-none");
  document.getElementById("reservation-form-wrap").classList.remove("d-none");
  document.getElementById("reservation-footer").classList.remove("d-none");
  document.getElementById("reservation-error").classList.add("d-none");
  getModal("reservationModal").show();
}

async function submitReservation() {
  const name     = document.getElementById("res-name").value.trim();
  const phone    = document.getElementById("res-phone").value.trim();
  const date     = document.getElementById("res-date").value;
  const time     = document.getElementById("res-time").value;
  const guests   = document.getElementById("res-guests").value;
  const occasion = document.getElementById("res-occasion").value;
  const seating  = document.getElementById("res-seating").value;
  const notes    = document.getElementById("res-notes").value.trim();
  const errBox   = document.getElementById("reservation-error");

  if (!name || !phone || !date || !time || !guests) {
    errBox.textContent = "Please fill in all required fields (marked with *).";
    errBox.classList.remove("d-none");
    return;
  }
  errBox.classList.add("d-none");

  const resData = {
    resId: `RES-${Date.now()}`,
    username: currentUser.username, name, phone, date, time,
    guests, occasion, seating, notes, status: "Pending"
  };

  try {
    const res = await fetch(`${API_URL}/reservations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resData)
    });
    if (res.ok) {
      resData.bookedAt = new Date().toLocaleString("en-IN");
      allReservations.push(resData);
      document.getElementById("reservation-form-wrap").classList.add("d-none");
      document.getElementById("reservation-footer").classList.add("d-none");
      document.getElementById("reservation-confirm-text").textContent =
        `Table for ${guests} on ${formatDate(date)} at ${time}. We'll see you soon, ${name}!`;
      document.getElementById("reservation-success").classList.remove("d-none");
      showToast("Table reserved! See you soon 🍽️");
    } else {
      errBox.textContent = "Failed to create reservation.";
      errBox.classList.remove("d-none");
    }
  } catch(e) {
    errBox.textContent = "Error communicating with server.";
    errBox.classList.remove("d-none");
  }
}

function showMyReservations() {
  const body  = document.getElementById("my-reservations-body");
  const myRes = allReservations.filter(r => r.username === currentUser.username);
  if (!myRes.length) {
    body.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x"></i>No reservations yet.</div>`;
  } else {
    body.innerHTML = myRes.slice().reverse().map(r => `
      <div class="reservation-card">
        <div class="res-header">
          <div>
            <span class="res-id">${r.resId}</span>
            <span class="text-muted ms-2" style="font-size:0.78rem;">Booked: ${r.bookedAt}</span>
          </div>
          <span class="res-status res-status-${r.status.toLowerCase()}">${r.status}</span>
        </div>
        <div class="res-detail-row">
          <span><i class="bi bi-calendar3"></i>${formatDate(r.date)}</span>
          <span><i class="bi bi-clock"></i>${r.time}</span>
          <span><i class="bi bi-people"></i>${r.guests} Guests</span>
          ${r.seating  ? `<span><i class="bi bi-layout-text-sidebar"></i>${r.seating}</span>` : ""}
          ${r.occasion ? `<span><i class="bi bi-balloon-heart"></i>${r.occasion}</span>`      : ""}
        </div>
        ${r.notes ? `<p class="mb-0 mt-1" style="font-size:0.83rem;color:#888;"><i class="bi bi-chat-dots me-1"></i>${r.notes}</p>` : ""}
      </div>`).join("");
  }
  getModal("myReservationsModal").show();
}

// ─── CHEF'S SPECIALS ─────────────────────────────────────────────────────────
function renderSpecialsGrid() {
  const grid = document.getElementById("specials-grid");
  if (!grid) return;
  if (!chefsSpecials.length) {
    grid.innerHTML = `<div class="empty-state col-12"><i class="bi bi-fire"></i>No specials today. Check back tomorrow!</div>`;
    return;
  }
  grid.innerHTML = chefsSpecials.map(s => `
    <div class="col-sm-6 col-md-4 col-lg-3">
      <div class="special-card">
        <span class="special-ribbon">${s.tag || "Special"}</span>
        ${s.image
          ? `<img src="${s.image}" alt="${s.name}" class="special-card-img" onerror="this.style.display='none'">`
          : `<div class="special-card-placeholder"><i class="bi bi-fire"></i></div>`}
        <div class="special-body">
          <div class="d-flex align-items-center gap-1 mb-1">
            <span class="veg-dot ${s.veg}"></span>
            <span style="font-size:0.78rem;color:#888;">${s.veg === "veg" ? "Veg" : "Non-Veg"}</span>
          </div>
          <div class="special-name">${s.name}</div>
          <div class="special-desc">${s.desc}</div>
          <div class="special-footer">
            <span class="price-tag">₹${s.price}</span>
            <span class="badge-cat">Today Only</span>
          </div>
          <div class="chef-tag"><i class="bi bi-person-badge"></i> Chef's Recommendation</div>
        </div>
      </div>
    </div>`).join("");
}

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
function starsHtml(n) {
  let s = "";
  for (let i = 1; i <= 5; i++)
    s += `<span style="color:${i<=n?"#e6a817":"#d0cbc3"};font-size:1rem;">★</span>`;
  return s;
}

function renderRatingSummary() {
  const box = document.getElementById("rating-summary");
  if (!box) return;
  if (!reviews.length) { box.innerHTML = ""; return; }
  const avg    = reviews.reduce((s,r) => s+r.rating, 0) / reviews.length;
  const counts = [5,4,3,2,1].map(n => ({ n, c: reviews.filter(r => r.rating === n).length }));
  box.innerHTML = `
    <div class="d-flex align-items-center gap-4 flex-wrap">
      <div class="text-center">
        <div class="overall-score">${avg.toFixed(1)}</div>
        <div class="overall-stars mt-1">${starsHtml(Math.round(avg))}</div>
        <div style="font-size:0.82rem;color:#888;">${reviews.length} review${reviews.length!==1?"s":""}</div>
      </div>
      <div class="flex-fill">
        ${counts.map(({n,c}) => `
          <div class="rating-bar-row">
            <span class="rating-bar-label">${n} ★</span>
            <div class="rating-bar-track">
              <div class="rating-bar-fill" style="width:${reviews.length?(c/reviews.length*100).toFixed(0):0}%"></div>
            </div>
            <span class="rating-bar-count">${c}</span>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderReviewCards() {
  const grid = document.getElementById("reviews-grid");
  if (!grid) return;
  if (!reviews.length) {
    grid.innerHTML = `<div class="empty-state col-12"><i class="bi bi-chat-left"></i>No reviews yet. Be the first!</div>`;
    return;
  }
  grid.innerHTML = reviews.slice().reverse().slice(0,6).map(r => `
    <div class="col-md-6 col-lg-4">
      <div class="review-card">
        <div class="review-header">
          <div>
            <div class="review-author">${r.name}</div>
            <div class="review-date">${r.date}</div>
          </div>
          <div class="review-stars">${starsHtml(r.rating)}</div>
        </div>
        ${r.dish ? `<div class="review-dish-badge"><i class="bi bi-bowl-hot me-1"></i>${r.dish}</div>` : ""}
        <p class="review-text">${r.text}</p>
      </div>
    </div>`).join("");
}

function setReviewStar(n) {
  selectedReviewStar = n;
  document.querySelectorAll(".star-pick").forEach(s =>
    s.classList.toggle("active", parseInt(s.dataset.val) <= n)
  );
}

function submitReview() {
  const name = document.getElementById("review-name").value.trim();
  const text = document.getElementById("review-text").value.trim();
  const dish = document.getElementById("review-dish").value.trim();
  if (!name || !text)            { showToast("Please enter your name and review."); return; }
  if (!selectedReviewStar)       { showToast("Please select a star rating.");       return; }
  reviews.push({ id:++nextId, name, rating:selectedReviewStar, text, dish, date:"Just now" });
  selectedReviewStar = 0;
  document.querySelectorAll(".star-pick").forEach(s => s.classList.remove("active"));
  document.getElementById("review-name").value = "";
  document.getElementById("review-text").value = "";
  document.getElementById("review-dish").value = "";
  renderRatingSummary();
  renderReviewCards();
  showToast("Thank you for your review! ⭐");
}

// ─── ADMIN TABS ───────────────────────────────────────────────────────────────
const ADMIN_TABS = ["menu-management","orders-management","reservations-admin","specials-admin","reviews-admin"];

function showAdminTab(tab) {
  ADMIN_TABS.forEach(t => document.getElementById(t).classList.add("d-none"));
  document.getElementById(tab).classList.remove("d-none");
  document.querySelectorAll("#adminTabs .nav-link").forEach(l => l.classList.remove("active"));
  document.querySelectorAll("#adminTabs .nav-link")[ADMIN_TABS.indexOf(tab)].classList.add("active");
  if (tab === "menu-management")    renderAdminMenu(currentAdminCat);
  if (tab === "orders-management")  renderAdminOrders();
  if (tab === "reservations-admin") renderAdminReservations();
  if (tab === "specials-admin")     renderAdminSpecials();
  if (tab === "reviews-admin")      renderAdminReviews();
}

// ─── ADMIN MENU ───────────────────────────────────────────────────────────────
function renderAdminMenu(cat) {
  currentAdminCat = cat;
  const list = cat === "all" ? menuItems : menuItems.filter(m => m.category === cat);
  const el   = document.getElementById("admin-menu-list");
  if (!list.length) {
    el.innerHTML = `<div class="col-12 empty-state"><i class="bi bi-bowl-hot"></i>No dishes in this category.</div>`;
    return;
  }
  el.innerHTML = list.map(item => `
    <div class="col-12">
      <div class="admin-dish-row">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" class="admin-dish-img" onerror="this.style.display='none'">`
          : `<div class="admin-dish-img-placeholder"><i class="bi bi-bowl-hot"></i></div>`}
        <div class="admin-dish-info">
          <div class="dish-name">${item.name}</div>
          <div class="dish-meta">
            <span class="badge-cat">${item.category}</span>
            <span class="ms-2 veg-dot ${item.veg}" style="display:inline-block;"></span>
            <span class="ms-1 text-muted">${item.veg==="veg"?"Veg":"Non-Veg"}</span>
          </div>
          <div class="dish-meta mt-1">${item.desc}</div>
        </div>
        <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">
          <span class="price-tag">₹${item.price}</span>
          <button class="btn btn-outline-warning btn-sm" onclick="openUpdatePrice(${item.id})">
            <i class="bi bi-pencil"></i> Price
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteDish(${item.id})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>`).join("");
}

function filterAdminCategory(cat, btn) {
  document.querySelectorAll("#menu-management .cat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderAdminMenu(cat);
}

async function addDish() {
  const name  = document.getElementById("new-name").value.trim();
  const cat   = document.getElementById("new-category").value;
  const price = parseInt(document.getElementById("new-price").value);
  const desc  = document.getElementById("new-desc").value.trim();
  const image = document.getElementById("new-image").value.trim();
  const veg   = document.getElementById("new-veg").value;
  if (!name || !cat || !price || price <= 0) {
    alert("Please fill in Dish Name, Category and a valid Price.");
    return;
  }
  try {
    const res = await fetch(`${API_URL}/menu`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category:cat, price, desc, image, veg })
    });
    if (res.ok) {
      const data = await res.json();
      menuItems.push({ id: data.id, name, category:cat, price, desc, image, veg });
      ["new-name","new-category","new-price","new-desc","new-image"].forEach(id =>
        document.getElementById(id).value = ""
      );
      renderAdminMenu(currentAdminCat);
      showToast(`"${name}" added to menu!`);
    } else showToast("Failed to add dish.");
  } catch(e) { showToast("Error connecting to server"); }
}

async function deleteDish(id) {
  const item = menuItems.find(m => m.id === id);
  if (!item || !confirm(`Delete "${item.name}" from the menu?`)) return;
  try {
    const res = await fetch(`${API_URL}/menu/${id}`, { method: "DELETE" });
    if (res.ok) {
      menuItems = menuItems.filter(m => m.id !== id);
      cart = cart.filter(c => c.id !== id);
      updateCartBadge();
      renderAdminMenu(currentAdminCat);
      showToast(`"${item.name}" deleted.`);
    } else showToast("Failed to delete dish.");
  } catch(e) { showToast("Error connecting to server"); }
}

function openUpdatePrice(id) {
  updateTargetId = id;
  const item = menuItems.find(m => m.id === id);
  document.getElementById("update-dish-name").textContent = item.name;
  document.getElementById("update-price-input").value = item.price;
  getModal("updatePriceModal").show();
}

async function confirmUpdatePrice() {
  const p = parseInt(document.getElementById("update-price-input").value);
  if (!p || p <= 0) { alert("Please enter a valid price."); return; }
  const item = menuItems.find(m => m.id === updateTargetId);
  if (item) { 
    try {
      const res = await fetch(`${API_URL}/menu/${updateTargetId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: p })
      });
      if (res.ok) {
        item.price = p; showToast(`Price updated to ₹${p} for "${item.name}"`);
        getModal("updatePriceModal").hide();
        renderAdminMenu(currentAdminCat);
      } else showToast("Failed to update price.");
    } catch(e) { showToast("Error connecting to server"); }
  }
}

// ─── ADMIN ORDERS ─────────────────────────────────────────────────────────────
function renderAdminOrders() {
  const list = document.getElementById("admin-orders-list");
  if (!allOrders.length) {
    list.innerHTML = `<div class="empty-state"><i class="bi bi-bag-x"></i>No orders placed yet.</div>`;
    return;
  }
  list.innerHTML = allOrders.slice().reverse().map(o => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <strong>${o.orderId}</strong>
          <span class="ms-2 text-muted" style="font-size:0.82rem;">${o.time}</span>
          <span class="ms-2 fw-semibold">${o.name} (${o.username})</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="order-status status-${o.status.toLowerCase()}">${o.status}</span>
          <select class="form-select form-select-sm" style="width:auto;"
            onchange="updateOrderStatus('${o.orderId}',this.value)">
            <option ${o.status==="Placed"    ?"selected":""}>Placed</option>
            <option ${o.status==="Confirmed" ?"selected":""}>Confirmed</option>
            <option ${o.status==="Delivered" ?"selected":""}>Delivered</option>
          </select>
        </div>
      </div>
      ${o.items.map(i => `
        <div class="order-item-row">
          <span>${i.name} × ${i.qty}</span>
          <span>₹${i.price*i.qty}</span>
        </div>`).join("")}
      <div class="d-flex justify-content-end mt-2"><strong>Total: ₹${o.total}</strong></div>
    </div>`).join("");
}

async function updateOrderStatus(orderId, status) {
  const o = allOrders.find(x => x.orderId === orderId);
  if (o) {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        o.status = status; showToast(`Order ${orderId} → "${status}"`); renderAdminOrders();
      } else showToast("Failed to update status.");
    } catch(e) { showToast("Error connecting to server"); }
  }
}

// ─── ADMIN RESERVATIONS ───────────────────────────────────────────────────────
function renderAdminReservations() {
  const list = document.getElementById("admin-reservations-list");
  const cnt  = document.getElementById("admin-res-count");
  cnt.textContent = `${allReservations.length} reservation${allReservations.length!==1?"s":""}`;
  if (!allReservations.length) {
    list.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x"></i>No reservations yet.</div>`;
    return;
  }
  list.innerHTML = allReservations.slice().reverse().map(r => `
    <div class="reservation-card">
      <div class="res-header">
        <div>
          <strong>${r.name}</strong>
          <span class="res-id ms-2">${r.resId}</span>
          <span class="text-muted ms-2" style="font-size:0.78rem;">${r.bookedAt}</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="res-status res-status-${r.status.toLowerCase()}">${r.status}</span>
          <select class="form-select form-select-sm" style="width:auto;"
            onchange="updateReservationStatus('${r.resId}',this.value)">
            <option ${r.status==="Pending"   ?"selected":""}>Pending</option>
            <option ${r.status==="Confirmed" ?"selected":""}>Confirmed</option>
            <option ${r.status==="Cancelled" ?"selected":""}>Cancelled</option>
          </select>
        </div>
      </div>
      <div class="res-detail-row">
        <span><i class="bi bi-telephone"></i>${r.phone}</span>
        <span><i class="bi bi-calendar3"></i>${formatDate(r.date)}</span>
        <span><i class="bi bi-clock"></i>${r.time}</span>
        <span><i class="bi bi-people"></i>${r.guests} Guests</span>
        ${r.seating  ? `<span><i class="bi bi-layout-text-sidebar"></i>${r.seating}</span>` : ""}
        ${r.occasion ? `<span><i class="bi bi-balloon-heart"></i>${r.occasion}</span>`      : ""}
      </div>
      ${r.notes ? `<p class="mb-0 mt-1" style="font-size:0.83rem;color:#888;"><i class="bi bi-chat-dots me-1"></i>${r.notes}</p>` : ""}
    </div>`).join("");
}

async function updateReservationStatus(resId, status) {
  const r = allReservations.find(x => x.resId === resId);
  if (r) {
    try {
      const res = await fetch(`${API_URL}/reservations/${resId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        r.status = status; showToast(`Reservation ${resId} → "${status}"`); renderAdminReservations();
      } else showToast("Failed to update status.");
    } catch(e) { showToast("Error connecting to server"); }
  }
}

// ─── ADMIN CHEF'S SPECIALS ────────────────────────────────────────────────────
function renderAdminSpecials() {
  const list = document.getElementById("admin-specials-list");
  if (!chefsSpecials.length) {
    list.innerHTML = `<div class="col-12 empty-state"><i class="bi bi-fire"></i>No specials added yet.</div>`;
    return;
  }
  list.innerHTML = chefsSpecials.map(s => `
    <div class="col-12">
      <div class="admin-dish-row">
        ${s.image
          ? `<img src="${s.image}" alt="${s.name}" class="admin-dish-img" onerror="this.style.display='none'">`
          : `<div class="admin-dish-img-placeholder"><i class="bi bi-fire"></i></div>`}
        <div class="admin-dish-info">
          <div class="dish-name">${s.name}
            <span class="badge ms-1" style="background:var(--accent);color:#111;font-size:0.7rem;">${s.tag||"Special"}</span>
          </div>
          <div class="dish-meta">
            <span class="veg-dot ${s.veg}" style="display:inline-block;"></span>
            <span class="ms-1 text-muted">${s.veg==="veg"?"Veg":"Non-Veg"}</span>
          </div>
          <div class="dish-meta mt-1">${s.desc}</div>
        </div>
        <div class="ms-auto d-flex align-items-center gap-2">
          <span class="price-tag">₹${s.price}</span>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteSpecial(${s.id})">
            <i class="bi bi-trash"></i> Remove
          </button>
        </div>
      </div>
    </div>`).join("");
}

async function addSpecial() {
  const name  = document.getElementById("sp-name").value.trim();
  const price = parseInt(document.getElementById("sp-price").value);
  const desc  = document.getElementById("sp-desc").value.trim();
  const image = document.getElementById("sp-image").value.trim();
  const tag   = document.getElementById("sp-tag").value.trim() || "Special";
  const veg   = document.getElementById("sp-veg").value;
  if (!name || !price || !desc) { alert("Please fill in Name, Price and Description."); return; }
  try {
    const res = await fetch(`${API_URL}/specials`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, desc, image, tag, veg })
    });
    if (res.ok) {
      const data = await res.json();
      chefsSpecials.push({ id: data.id, name, price, desc, image, tag, veg });
      ["sp-name","sp-price","sp-desc","sp-image","sp-tag"].forEach(id =>
        document.getElementById(id).value = ""
      );
      renderAdminSpecials();
      renderSpecialsGrid();
      showToast(`"${name}" added to Chef's Specials!`);
    } else showToast("Failed to add special.");
  } catch(e) { showToast("Error connecting to server"); }
}

async function deleteSpecial(id) {
  const sp = chefsSpecials.find(s => s.id === id);
  if (!sp || !confirm(`Remove "${sp.name}" from specials?`)) return;
  try {
    const res = await fetch(`${API_URL}/specials/${id}`, { method: "DELETE" });
    if (res.ok) {
      chefsSpecials = chefsSpecials.filter(s => s.id !== id);
      renderAdminSpecials();
      renderSpecialsGrid();
      showToast(`"${sp.name}" removed.`);
    } else showToast("Failed to remove special.");
  } catch(e) { showToast("Error connecting to server"); }
}

// ─── ADMIN REVIEWS ────────────────────────────────────────────────────────────
function renderAdminReviews() {
  const list = document.getElementById("admin-reviews-list");
  const cnt  = document.getElementById("admin-review-count");
  const avg  = reviews.length
    ? (reviews.reduce((s,r) => s+r.rating, 0)/reviews.length).toFixed(1)
    : "—";
  cnt.textContent = `${reviews.length} review${reviews.length!==1?"s":""} · Avg: ${avg} ★`;
  if (!reviews.length) {
    list.innerHTML = `<div class="empty-state"><i class="bi bi-chat-left"></i>No reviews yet.</div>`;
    return;
  }
  list.innerHTML = reviews.slice().reverse().map(r => `
    <div class="order-card mb-3">
      <div class="order-header">
        <div>
          <strong>${r.name}</strong>
          <span class="ms-2 text-muted" style="font-size:0.82rem;">${r.date}</span>
          ${r.dish ? `<span class="ms-2 review-dish-badge">${r.dish}</span>` : ""}
        </div>
        <div class="d-flex align-items-center gap-2">
          <span>${starsHtml(r.rating)}</span>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteReview(${r.id})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <p class="mb-0" style="font-size:0.88rem;color:#555;">${r.text}</p>
    </div>`).join("");
}

async function deleteReview(id) {
  if (!confirm("Delete this review?")) return;
  try {
    const res = await fetch(`${API_URL}/reviews/${id}`, { method: 'DELETE' });
    if (res.ok) {
      reviews = reviews.filter(r => r.id !== id);
      renderAdminReviews();
      renderReviewCards();
      renderRatingSummary();
      showToast("Review deleted.");
    } else showToast("Failed to delete review.");
  } catch(e) { showToast("Error connecting to server"); }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short", year:"numeric" });
}

function showToast(msg) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.style.cssText = `
    background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:8px;
    border-left:4px solid #e6a817;font-size:0.88rem;
    box-shadow:0 4px 12px rgba(0,0,0,.25);max-width:300px;`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-password").addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });
  fetchInitialData();
});
