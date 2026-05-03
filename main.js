import { supabase } from './config.js';

// Estado global
let currentUser = null;
let businesses = [];
let userProducts = [];
let userBusiness = null;

// Inicialización
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    try {
        await checkAuth();
        
        // Cargar datos según la página
        if (isIndexPage()) {
            await loadBusinesses();
        } else if (isDashboardPage()) {
            await loadDashboardData();
            initDashboard();
        }
        
        setupForms();
        console.log('✅ MiZona inicializado correctamente');
    } catch (error) {
        console.error('Error en initApp:', error);
    }
}

// === UTILIDADES ===
function isIndexPage() {
    return window.location.pathname.includes('index.html') || window.location.pathname === '/';
}

function isDashboardPage() {
    return window.location.pathname.includes('dashboard.html');
}

function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return null;
    
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

// === AUTENTICACIÓN ===
async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user || null;
        
        if (isDashboardPage() && !currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        // Cargar datos del negocio del usuario logueado
        if (currentUser) {
            await loadUserBusiness();
        }
    } catch (error) {
        console.error('Error en checkAuth:', error);
    }
}

async function loadUserBusiness() {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('email', currentUser.email)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; // Ignorar "no rows"
        userBusiness = data;
        updateUserUI();
    } catch (error) {
        console.error('Error loading user business:', error);
    }
}

function updateUserUI() {
    if (!userBusiness) return;
    
    // Sidebar
    const businessNameEl = document.getElementById('businessName');
    const businessCityEl = document.getElementById('businessCity');
    const userNameEl = document.getElementById('userName');
    const userWhatsAppEl = document.getElementById('userWhatsApp');
    const userAvatarEl = document.getElementById('userAvatar');
    const headerAvatarEl = document.getElementById('headerAvatar');
    const headerUserNameEl = document.getElementById('headerUserName');
    
    if (businessNameEl) businessNameEl.textContent = userBusiness.business_name;
    if (businessCityEl) businessCityEl.textContent = userBusiness.city;
    if (userNameEl) userNameEl.textContent = userBusiness.full_name;
    if (userWhatsAppEl) userWhatsAppEl.textContent = userBusiness.whatsapp;
    if (userAvatarEl) userAvatarEl.textContent = userBusiness.full_name.charAt(0).toUpperCase();
    if (headerAvatarEl) headerAvatarEl.textContent = userBusiness.full_name.charAt(0).toUpperCase();
    if (headerUserNameEl) headerUserNameEl.textContent = userBusiness.full_name;
}

// === INDEX PAGE ===
async function loadBusinesses() {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('approved', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        businesses = data || [];
        renderBusinesses();
    } catch (error) {
        console.error('Error loading businesses:', error);
        showError('No se pudieron cargar los negocios');
    }
}

function renderBusinesses() {
    const grid = document.getElementById('businessGrid');
    const countEl = document.getElementById('businessCount');
    
    if (!grid) return;
    
    if (countEl) countEl.textContent = businesses.length;
    
    if (businesses.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">
                <i class="fas fa-store" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                <h3>Aún no hay negocios</h3>
                <p>¡Sé el primero en registrarte gratis!</p>
                <a href="register.html" class="btn-register" style="margin-top: 1rem; display: inline-block;">
                    Registrarme Gratis
                </a>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = businesses.map(business => `
        <div class="business-card">
            <a href="tienda.html?id=${business.id}">
                <img src="${business.logo || 'https://via.placeholder.com/320x200?text=📸'}" 
                     alt="${business.business_name}" 
                     onerror="this.src='https://via.placeholder.com/320x200?text=Sin+Logo'">
            </a>
            <div class="card-body">
                <span class="category">${business.category || 'General'}</span>
                <h3>${business.business_name}</h3>
                <p>${business.description || 'Negocio local verificado'}</p>
                <div class="card-footer">
                    <span class="location">📍 ${business.city}</span>
                    <a href="tienda.html?id=${business.id}" class="btn-view">
                        Ver Productos <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// === DASHBOARD ===
async function loadDashboardData() {
    if (!userBusiness) return;
    
    await loadUserProducts();
}

async function loadUserProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', userBusiness.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        userProducts = data || [];
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showError('No se pudieron cargar los productos');
    }
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (userProducts.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">
                <i class="fas fa-box-open" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No tienes productos</h3>
                <p>¡Publica tu primer producto para empezar a vender!</p>
                <button class="btn-primary" onclick="showAddProductModal()" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Nuevo Producto
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = userProducts.map(product => {
        const stockClass = product.stock > 20 ? 'stock-ok' : 
                          product.stock > 5 ? 'stock-low' : 'stock-out';
        
        return `
            <div class="product-card">
                <img src="${product.image_url || 'https://via.placeholder.com/320x200?text=📸'}" 
                     alt="${product.name}" class="product-image"
                     onerror="this.src='https://via.placeholder.com/320x200?text=Sin+Imagen'">
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">Bs ${parseFloat(product.price).toFixed(2)}</div>
                    <div class="product-stock">
                        <i class="fas fa-inventory"></i>
                        <span class="${stockClass}">${product.stock} disponibles</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn-action btn-edit" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// === REGISTRO (SOLO SI EXISTE EL FORM) ===
async function setupForms() {
    // Registro - Solo si existe el formulario
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Login - Solo si existe el formulario
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Productos - Solo si existe el formulario
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleAddProduct);
        setupImageUpload();
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    
    try {
        // OBTENER VALORES DIRECTAMENTE (no FormData)
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value) || 0;
        const description = document.getElementById('productDesc').value.trim();
        
        // VALIDACIONES
        if (!name) throw new Error('Nombre requerido');
        if (isNaN(price) || price <= 0) throw new Error('Precio inválido');
        
        const productData = {
            business_id: userBusiness.id,
            name: name,
            price: price,  // ✅ NUMERO, no string
            stock: stock,
            description: description
        };
        
        // IMAGEN OPCIONAL
        const fileInput = document.getElementById('productImage');
        if (fileInput.files[0]) {
            productData.image_url = await uploadProductImage(fileInput.files[0]);
        }
        
        console.log('📦 Enviando producto:', productData); // DEBUG
        
        // INSERTAR
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Producto creado:', data);
        alert('✅ Producto publicado exitosamente');
        closeProductModal();
        await loadUserProducts(); // Recargar lista
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        alert('❌ Error: ' + error.message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    try {
        const identifier = document.getElementById('loginIdentifier').value;
        const password = document.getElementById('loginPassword').value;
        
        // Buscar usuario por email o whatsapp
        const { data: userData, error: searchError } = await supabase
            .from('businesses')
            .select('email')
            .or(`email.eq.${identifier},whatsapp.eq.${identifier}`)
            .single();
        
        if (searchError && searchError.code !== 'PGRST116') {
            throw searchError;
        }
        
        if (!userData?.email) {
            alert('❌ Usuario no encontrado');
            return;
        }
        
        const { error } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password
        });
        
        if (error) {
            alert('❌ Error de login: ' + error.message);
            return;
        }
        
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// === PRODUCTOS ===
async function handleAddProduct(e) {
    e.preventDefault();
    
    try {
        const fileInput = document.getElementById('productImage');
        const imageFile = fileInput.files[0];
        
        const productData = {
            business_id: userBusiness.id,  // ✅ ID sincronizado
            name: document.getElementById('productName').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            description: document.getElementById('productDesc').value || ''
        };
        
        // Subir imagen si existe
        if (imageFile) {
            productData.image_url = await uploadProductImage(imageFile);
        }
        
        const { error } = await supabase
            .from('products')
            .insert([productData]);
        
        if (error) throw error;
        
        alert('✅ Producto creado exitosamente');
        closeProductModal();
        await loadUserProducts();
    } catch (error) {
        alert('❌ Error al crear producto: ' + error.message);
    }
}

async function uploadProductImage(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `products/${userBusiness.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
        
        return data.publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error('Error al subir imagen: ' + error.message);
    }
}

function setupImageUpload() {
    const uploadArea = document.getElementById('imageUpload');
    const fileInput = document.getElementById('productImage');
    const preview = document.getElementById('imagePreview');
    
    if (!uploadArea || !fileInput || !preview) return;
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        uploadArea.addEventListener(event, e => e.preventDefault());
    });
    
    ['dragenter', 'dragover'].forEach(event => {
        uploadArea.addEventListener(event, () => uploadArea.classList.add('dragover'));
    });
    
    ['dragleave', 'drop'].forEach(event => {
        uploadArea.addEventListener(event, () => uploadArea.classList.remove('dragover'));
    });
    
    uploadArea.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        handleImageFiles(files);
    });
    
    fileInput.addEventListener('change', e => {
        handleImageFiles(e.target.files);
    });
    
    function handleImageFiles(files) {
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = e => {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
}

// === FUNCIONES DASHBOARD (EXPONER AL GLOBAL) ===
function initDashboard() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            showSection(this.dataset.section, this);
        });
    });
    
    window.onclick = e => {
        const modal = document.getElementById('productModal');
        if (e.target === modal) closeProductModal();
    };
}

window.showAddProductModal = () => {
    document.getElementById('productModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Nuevo Producto';
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
};

window.editProduct = async id => {
    const product = userProducts.find(p => p.id === id);
    if (!product) return alert('Producto no encontrado');
    
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDesc').value = product.description;
    
    document.getElementById('modalTitle').textContent = 'Editar Producto';
    document.getElementById('productModal').style.display = 'block';
};

window.deleteProduct = async id => {
    if (!confirm('¿Eliminar este producto?')) return;
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        alert('✅ Producto eliminado');
        await loadUserProducts();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
};

function showSection(sectionId, navElement) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(sectionId)?.classList.add('active');
    navElement?.classList.add('active');
}

window.logout = async () => {
    try {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

window.searchBusinesses = () => {
    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filtered = businesses.filter(b => 
        b.business_name?.toLowerCase().includes(query) || 
        b.category?.toLowerCase().includes(query) ||
        b.city?.toLowerCase().includes(query)
    );
    renderBusinessesFiltered(filtered);
};

function renderBusinessesFiltered(filtered) {
    const grid = document.getElementById('businessGrid');
    if (grid) {
        grid.innerHTML = filtered.length ? 
            filtered.map(b => `
                <div class="business-card">
                    <a href="tienda.html?id=${b.id}">
                        <img src="${b.logo || 'https://via.placeholder.com/320x200'}" alt="${b.business_name}">
                    </a>
                    <div class="card-body">
                        <span class="category">${b.category}</span>
                        <h3>${b.business_name}</h3>
                        <p>${b.description}</p>
                        <div class="card-footer">
                            <span class="location">📍 ${b.city}</span>
                            <a href="tienda.html?id=${b.id}" class="btn-view">Visitar</a>
                        </div>
                    </div>
                </div>
            `).join('') : 
            '<div class="no-results">No se encontraron resultados</div>';
    }
}

function showError(message) {
    const grid = document.getElementById('businessGrid');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Error de carga</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">
                    Reintentar
                </button>
            </div>
        `;
    }
}