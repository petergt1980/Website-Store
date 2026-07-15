// --- Database User Mockup (LocalStorage) ---
// Kita biarkan user pakai localStorage agar sistem login/register prototype tetap berjalan
const initDB = () => {
    if (!localStorage.getItem('crs_users')) {
        const admin = { username: 'admin', pass: 'admin123', role: 'admin', purchases: [] };
        localStorage.setItem('crs_users', JSON.stringify([admin]));
    }
};

let currentUser = null;
let cart = [];
let currentCategory = 'All';
let globalProducts = []; // Menyimpan data sementara dari Firebase agar loading cepat

// --- Fetch Data dari Firebase ---
const fetchProductsFromDB = async () => {
    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "products"));
        let products = [];
        querySnapshot.forEach((doc) => {
            // Menggabungkan ID document Firebase dengan isi datanya
            products.push({ id: doc.id, ...doc.data() });
        });
        globalProducts = products; // Simpan ke variabel global
        return products;
    } catch (error) {
        console.error("Error mengambil data dari Firebase: ", error);
        return []; 
    }
};

window.onload = async () => {
    initDB();
    checkSession();
    await fetchProductsFromDB(); // Download data produk dari Firebase saat web dibuka
    renderProducts();
};

const navigate = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewId === 'cart') renderCart();
    if (viewId === 'admin') loadAdminData();
    if (viewId === 'profile') loadProfileData();
};

const showToast = (msg, type = "success") => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'error' ? '#FF3B3B' : '#00ff88';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
};

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
const closeModal = (id) => document.getElementById(id).classList.add('hidden');

// --- Auth System ---
const checkSession = () => {
    const session = sessionStorage.getItem('crs_session');
    if (session) {
        currentUser = JSON.parse(localStorage.getItem('crs_users')).find(u => u.username === session);
        if (currentUser && currentUser.role === 'admin') document.getElementById('admin-btn').classList.remove('hidden');
    }
};

const checkAuth = () => { if (currentUser) navigate('profile'); else navigate('auth'); };

const handleLogin = (e) => {
    e.preventDefault();
    const user = document.getElementById('auth-user').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    let users = JSON.parse(localStorage.getItem('crs_users'));
    let account = users.find(u => u.username === user);

    if (!account) {
        account = { username: user, pass: pass, role: 'member', purchases: [] };
        users.push(account);
        localStorage.setItem('crs_users', JSON.stringify(users));
        showToast("Account created!");
    } else if (account.pass !== pass) {
        return showToast("Invalid password!", "error");
    }

    sessionStorage.setItem('crs_session', user);
    currentUser = account;
    if (currentUser.role === 'admin') document.getElementById('admin-btn').classList.remove('hidden');
    
    showToast(`Welcome, ${user}!`);
    navigate('profile');
};

const logout = () => {
    sessionStorage.removeItem('crs_session');
    currentUser = null;
    document.getElementById('admin-btn').classList.add('hidden');
    navigate('home');
    showToast("Logged out");
};

// --- Store & Products ---
const renderProducts = (searchQuery = '') => {
    const products = globalProducts; // Ambil dari data yg sudah didownload
    const homeContainer = document.getElementById('home-products');
    const storeContainer = document.getElementById('store-products');
    
    let filtered = currentCategory !== 'All' ? products.filter(p => p.category === currentCategory) : products;
    if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const buildHTML = (list) => list.map(p => `
        <div class="product-card">
            <div class="product-img"><i class="fa-solid ${p.icon}"></i></div>
            <div class="product-cat">${p.category}</div>
            <h3 class="product-title">${p.name}</h3>
            <p class="text-muted" style="font-size:0.85rem; margin-bottom: 12px; height: 40px;">${p.desc}</p>
            <div class="product-price text-gradient">${formatRupiah(p.price)}</div>
            <button class="btn-primary w-100" onclick="addToCart('${p.id}')">Add to Cart</button>
        </div>`).join('');

    storeContainer.innerHTML = buildHTML(filtered);
    homeContainer.innerHTML = buildHTML(products.slice(0, 4));
};

const filterCategory = (cat) => {
    currentCategory = cat;
    document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
    renderProducts();
};

const filterProducts = () => renderProducts(document.getElementById('search-input').value);

// --- Cart & Checkout (WA/Discord Redirect) ---
const addToCart = (id) => {
    cart.push(globalProducts.find(p => p.id === id));
    document.getElementById('cart-count').innerText = cart.length;
    showToast(`Added to cart!`);
};

const renderCart = () => {
    const container = document.getElementById('cart-items-container');
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">Your cart is empty.</p>';
        document.getElementById('cart-subtotal').innerText = 'Rp 0';
        document.getElementById('cart-tax').innerText = 'Rp 0';
        document.getElementById('cart-total').innerText = 'Rp 0';
        return;
    }

    let html = '';
    let subtotal = 0;
    cart.forEach((item, index) => {
        subtotal += item.price;
        html += `<div class="cart-item">
            <div><h4>${item.name}</h4></div>
            <div style="display: flex; align-items: center; gap: 16px;">
                <span class="text-gradient">${formatRupiah(item.price)}</span>
                <button class="icon-btn" onclick="removeFromCart(${index})" style="color:var(--accent)"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    const tax = subtotal * 0.11;
    document.getElementById('cart-subtotal').innerText = formatRupiah(subtotal);
    document.getElementById('cart-tax').innerText = formatRupiah(tax);
    document.getElementById('cart-total').innerText = formatRupiah(subtotal + tax);
};

const removeFromCart = (index) => { cart.splice(index, 1); document.getElementById('cart-count').innerText = cart.length; renderCart(); };

const processCheckout = () => {
    if (cart.length === 0) return showToast("Cart is empty!", "error");
    if (!currentUser) { showToast("Login to checkout", "error"); return navigate('auth'); }
    
    // Tampilkan modal pilihan WA/Discord
    document.getElementById('checkout-contact-modal').classList.remove('hidden');
};

const formatCheckoutMessage = () => {
    let msg = `Halo Admin DapesDKK,\nSaya ingin membeli produk berikut:\n\n`;
    cart.forEach(i => msg += `- ${i.name} (${formatRupiah(i.price)})\n`);
    msg += `\n*Total Bayar:* ${document.getElementById('cart-total').innerText}\n`;
    msg += `*Username Akun:* ${currentUser.username}\n\nMohon info pembayarannya, terima kasih.`;
    return encodeURIComponent(msg);
};

const checkoutViaWA = () => {
    const waNumber = "6285604788705"; 
    const text = formatCheckoutMessage();
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
    clearCartAfterCheckout();
};

const checkoutViaDiscord = () => {
    const discordLink = "https://discord.gg/M2TER3dvG3"; 
    window.open(discordLink, '_blank');
    clearCartAfterCheckout();
};

const clearCartAfterCheckout = () => {
    closeModal('checkout-contact-modal');
    cart = [];
    document.getElementById('cart-count').innerText = 0;
    renderCart();
    navigate('profile');
    showToast("Diarahkan ke Chat Admin...");
};

// --- Profile ---
const loadProfileData = () => {
    document.getElementById('profile-username').innerText = currentUser.username;
    document.getElementById('order-history').innerHTML = '<p class="text-muted">Pembelian menunggu konfirmasi/pemberian manual oleh Admin via Chat.</p>';
};

// --- Admin Panel (CRUD to Firebase) ---
let editProductId = null;

const loadAdminData = () => {
    const products = globalProducts;
    const tbody = document.getElementById('admin-product-list');
    // Perhatikan pada tombol Delete, kita sekarang menggunakan p.id (ID dari Firebase)
    tbody.innerHTML = products.map((p) => `
        <tr>
            <td><span style="font-size:10px; color:#666;">${p.id}</span></td>
            <td><strong>${p.name}</strong></td>
            <td><span class="badge" style="margin:0;">${p.category}</span></td>
            <td>${formatRupiah(p.price)}</td>
            <td>
                <button class="btn-secondary" style="padding: 6px; font-size:12px;" onclick="openEditModal('${p.id}')">Edit</button>
                <button class="btn-secondary" style="padding: 6px; font-size:12px; color:#FF3B3B; border-color:#FF3B3B;" onclick="adminDeleteProduct('${p.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
};

const adminDeleteProduct = async (id) => {
    if(confirm('Yakin ingin menghapus produk ini dari Server Firebase?')) {
        try {
            await window.deleteDoc(window.doc(window.db, "products", id));
            await fetchProductsFromDB(); // Download ulang data terbaru
            loadAdminData(); 
            renderProducts(); 
            showToast("Produk Berhasil Dihapus", "success");
        } catch (error) {
            console.error("Gagal menghapus:", error);
            showToast("Gagal menghapus produk", "error");
        }
    }
};

const openAddProductModal = async () => {
    const name = prompt("Enter Name:"); if(!name) return;
    const cat = prompt("Enter Category:", "Panel");
    const price = parseInt(prompt("Enter Price:", "100000"));
    
    if(name && cat && price) {
        try {
            showToast("Sedang menambahkan ke Server...", "success");
            await window.addDoc(window.collection(window.db, "products"), {
                name: name,
                category: cat,
                price: price,
                icon: 'fa-box',
                desc: 'Premium tool'
            });
            await fetchProductsFromDB(); // Download ulang data terbaru
            loadAdminData(); 
            renderProducts(); 
            showToast("Produk Berhasil Ditambahkan!");
        } catch (error) {
            console.error("Gagal menambah:", error);
            showToast("Gagal menambahkan produk", "error");
        }
    }
};

// Logika Edit Product Firebase
const openEditModal = (id) => {
    const p = globalProducts.find(prod => prod.id === id);
    if (!p) return;
    editProductId = id;
    document.getElementById('edit-p-name').value = p.name;
    document.getElementById('edit-p-cat').value = p.category;
    document.getElementById('edit-p-price').value = p.price;
    document.getElementById('edit-p-icon').value = p.icon || "fa-box";
    document.getElementById('edit-p-desc').value = p.desc || "";
    document.getElementById('edit-product-modal').classList.remove('hidden');
};

const saveEditProduct = async () => {
    if (!editProductId) return;
    
    try {
        const newName = document.getElementById('edit-p-name').value;
        const newCat = document.getElementById('edit-p-cat').value;
        const newPrice = parseInt(document.getElementById('edit-p-price').value);
        const newIcon = document.getElementById('edit-p-icon').value;
        const newDesc = document.getElementById('edit-p-desc').value;
        
        showToast("Menyimpan ke server...");
        
        await window.updateDoc(window.doc(window.db, "products", editProductId), {
            name: newName,
            category: newCat,
            price: newPrice,
            icon: newIcon,
            desc: newDesc
        });
        
        await fetchProductsFromDB(); // Download ulang data terbaru dari database
        loadAdminData();
        renderProducts();
        closeModal('edit-product-modal');
        showToast("Product Updated Successfully!");
    } catch (error) {
        console.error("Gagal mengupdate:", error);
        showToast("Gagal mengupdate produk", "error");
    }
};
