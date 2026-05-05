// Initialize Lucide Icons
lucide.createIcons();

const IMGBB_API_KEY = "b5a7d1d92fcc5c4e9f3185961e9533ed";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBnYczto0EvZU-LowX1Ps3NvYALnmmutr0",
    authDomain: "ljioik.firebaseapp.com",
    projectId: "ljioik",
    storageBucket: "ljioik.firebasestorage.app",
    messagingSenderId: "259534088287",
    appId: "1:259534088287:web:25a5a689146ad7792ad3ea"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// App State
let isAuthenticated = false;
let currentTab = 'products';
let viewMode = 'list'; // 'list' or 'form'

let productsData = [];
let adsData = [];
let bannersData = [];
let unsubProducts = null;
let unsubAds = null;
let unsubBanners = null;

// DOM
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const dashboard = document.getElementById('dashboard');
const logoutBtn = document.getElementById('logout-btn');
const navTabs = document.querySelectorAll('.nav-tab');
const contentArea = document.getElementById('content-area');
const loader = document.getElementById('loader');

// Login Logic
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (passwordInput.value === '1001') {
        isAuthenticated = true;
        loginError.classList.add('hidden');
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        dashboard.classList.add('flex');
        startSubscriptions();
        renderActiveTab();
    } else {
        loginError.classList.remove('hidden');
        passwordInput.value = '';
        setTimeout(() => loginError.classList.add('hidden'), 2000);
    }
});

logoutBtn.addEventListener('click', () => {
    isAuthenticated = false;
    dashboard.classList.add('hidden');
    dashboard.classList.remove('flex');
    loginScreen.classList.remove('hidden');
    passwordInput.value = '';
    stopSubscriptions();
});

// Image Utils
function compressImage(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800; // تقليص الحجم
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/webp', quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

async function uploadToImgBB(blob) {
    const formData = new FormData();
    formData.append('image', blob, 'image.jpg');
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json();
    if (data.success) {
        return { url: data.data.url, deleteUrl: data.data.delete_url };
    }
    throw new Error('Upload failed');
}

async function deleteFromImgBB(deleteUrl) {
    if (!deleteUrl) return;
    try {
        await fetch(deleteUrl, { mode: 'no-cors' });
    } catch (e) {
        console.error("ImgBB delete fetch error:", e);
    }
}

// Subscriptions
function startSubscriptions() {
    loader.classList.remove('hidden');
    
    unsubProducts = db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snap => {
        productsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentTab === 'products' && viewMode === 'list') renderProductsList();
    });

    unsubAds = db.collection('ads').orderBy('createdAt', 'desc').onSnapshot(snap => {
        adsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentTab === 'ads' && viewMode === 'list') renderAdsList();
    });

    unsubBanners = db.collection('banners').orderBy('createdAt', 'desc').onSnapshot(snap => {
        bannersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentTab === 'banners' && viewMode === 'list') renderBannersList();
        loader.classList.add('hidden');
    });
}

function stopSubscriptions() {
    if(unsubProducts) unsubProducts();
    if(unsubAds) unsubAds();
    if(unsubBanners) unsubBanners();
}

// UI Navigation
navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        viewMode = 'list';
        navTabs.forEach(t => {
            if(t.dataset.tab === currentTab) {
                t.classList.add('active');
                t.querySelector('.icon').classList.replace('text-gray-400', 'text-indigo-600');
                t.querySelector('.label').classList.replace('text-gray-400', 'text-indigo-600');
            } else {
                t.classList.remove('active');
                t.querySelector('.icon').classList.replace('text-indigo-600', 'text-gray-400');
                t.querySelector('.label').classList.replace('text-indigo-600', 'text-gray-400');
            }
        });
        renderActiveTab();
    });
});

function renderActiveTab() {
    if (viewMode === 'form') return; // Handled by individual renderers
    if (currentTab === 'products') renderProductsList();
    if (currentTab === 'ads') renderAdsList();
    if (currentTab === 'banners') renderBannersList();
}

// ---------------- PRODUCTS ---------------- //
function renderProductsList() {
    let topHtml = `
        <div class="flex justify-between items-center mb-6 animate-slide-up">
            <h3 class="text-xl font-extrabold text-gray-800">المنتجات</h3>
            <button onclick="showProductForm()" class="flex items-center gap-2 bg-indigo-600/90 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md">
                <i data-lucide="plus" class="w-5 h-5"></i> إضافة
            </button>
        </div>
    `;

    if (productsData.length === 0) {
        contentArea.innerHTML = topHtml + `
            <div class="text-center py-16 text-gray-500 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-sm animate-slide-up">
                <i data-lucide="package" class="w-14 h-14 mx-auto mb-4 opacity-30"></i>
                <p class="font-bold text-lg">لا توجد منتجات حالياً</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    let cardsHtml = '<div class="space-y-6 animate-slide-up">';
    productsData.forEach(p => {
        cardsHtml += `
            <div class="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-sm border border-white/70">
                <div class="relative w-full h-[250px] mb-5 rounded-[1.5rem] overflow-hidden bg-gray-50 border border-gray-100">
                    <img src="${p.imageUrl}" alt="${p.name}" class="w-full h-full object-cover opacity-0 blur-sm transition-all duration-700" onload="this.classList.remove('opacity-0', 'blur-sm')">
                </div>
                <div class="flex justify-between items-start gap-4 mb-3">
                    <h2 class="text-2xl font-extrabold text-gray-800">${p.name}</h2>
                    ${p.price ? `<span class="text-indigo-700 font-black text-lg bg-indigo-50/80 backdrop-blur-sm px-4 py-1.5 rounded-xl whitespace-nowrap">${p.price}</span>` : ''}
                </div>
                <p class="text-gray-500 font-medium mb-5">${p.description}</p>
                <div class="flex justify-end pt-4 border-t border-gray-100/80">
                    <button onclick="deleteProduct('${p.id}', '${p.deleteUrl || ''}')" class="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        `;
    });
    cardsHtml += '</div>';

    contentArea.innerHTML = topHtml + cardsHtml;
    lucide.createIcons();
}

window.deleteProduct = async (id, deleteUrl) => {
    if (!confirm('هل أنت متأكد من حذف المنتج؟')) return;
    try {
        if (deleteUrl && deleteUrl !== 'undefined') {
            try { await deleteFromImgBB(deleteUrl); } catch(e) { console.error('ImgBB delete', e); }
        }
        await db.collection('products').doc(id).delete();
    } catch (e) {
        console.error("Delete Error:", e);
        alert('حدث خطأ أثناء الحذف: ' + e.message);
    }
};

window.showProductForm = () => {
    viewMode = 'form';
    contentArea.innerHTML = `
        <div class="bg-white/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/60 shadow-sm animate-slide-up">
            <div class="flex justify-between items-center mb-8">
                <h3 class="text-2xl font-extrabold text-gray-800">إضافة منتج جديد</h3>
                <button onclick="cancelForm()" class="text-gray-400 hover:text-red-500 bg-white/50 p-2 rounded-full transition-colors"><i data-lucide="x-circle" class="w-6 h-6"></i></button>
            </div>
            <form id="product-form" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">اسم المنتج *</label>
                        <input type="text" id="pf-name" required class="custom-input">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">السعر (اختياري)</label>
                        <input type="text" id="pf-price" class="custom-input">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">الوصف *</label>
                    <textarea id="pf-desc" required rows="3" class="custom-input"></textarea>
                </div>
                
                <!-- روابط المنتج -->
                <div class="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50">
                    <div class="flex justify-between items-center mb-4">
                        <label class="block text-sm font-bold text-indigo-900 border-b-2 border-indigo-200 pb-1">روابط المنتج</label>
                        <button type="button" onclick="addLinkField()" class="text-sm font-bold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                            <i data-lucide="plus" class="w-4 h-4"></i> رابط
                        </button>
                    </div>
                    <div id="pf-links-container" class="space-y-3">
                        <p class="text-sm text-gray-400 text-center font-medium py-2">لم يتم إضافة روابط</p>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">صورة المنتج *</label>
                    <label class="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-indigo-300 rounded-[1.5rem] cursor-pointer bg-indigo-50/40 hover:bg-indigo-50/80 transition-colors relative overflow-hidden group">
                        <div id="pf-img-placeholder" class="flex flex-col items-center justify-center p-6 text-center">
                            <i data-lucide="upload" class="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-transform"></i>
                            <p class="text-sm font-bold text-indigo-500">اضغط لرفع صورة</p>
                        </div>
                        <img id="pf-img-preview" class="img-preview hidden">
                        <input type="file" id="pf-image" accept="image/*" class="hidden" required>
                    </label>
                </div>
                
                <button type="submit" id="pf-submit" class="w-full mt-8 py-4 text-lg font-bold text-white bg-indigo-600/90 rounded-2xl flex justify-center items-center shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-70">
                    حفظ المنتج
                </button>
            </form>
        </div>
    `;
    lucide.createIcons();
    
    // Image Preview logic
    document.getElementById('pf-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                document.getElementById('pf-img-preview').src = reader.result;
                document.getElementById('pf-img-preview').classList.remove('hidden');
                document.getElementById('pf-img-placeholder').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // Form submit
    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('pf-submit');
        const file = document.getElementById('pf-image').files[0];
        if (!file) return;

        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>';
        lucide.createIcons();

        try {
            const compressed = await compressImage(file);
            const imgRes = await uploadToImgBB(compressed);
            
            // Gather links
            const linkElements = document.querySelectorAll('.pf-link-item');
            const links = [];
            linkElements.forEach((el, index) => {
                const label = el.querySelector('.link-label').value;
                const url = el.querySelector('.link-url').value;
                if(label && url) links.push({ id: Date.now() + index, label, url });
            });

            await db.collection('products').add({
                name: document.getElementById('pf-name').value,
                price: document.getElementById('pf-price').value,
                description: document.getElementById('pf-desc').value,
                imageUrl: imgRes.url,
                deleteUrl: imgRes.deleteUrl,
                links: links,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            cancelForm();
        } catch(err) {
            alert('حدث خطأ');
            btn.disabled = false;
            btn.innerHTML = 'حفظ المنتج';
        }
    });
};

window.addLinkField = () => {
    const container = document.getElementById('pf-links-container');
    if(container.innerHTML.includes('لم يتم إضافة روابط')) {
        container.innerHTML = '';
    }
    const div = document.createElement('div');
    div.className = 'pf-link-item flex gap-3 items-center bg-white/50 p-3 rounded-xl border border-white/60 animate-slide-up';
    div.innerHTML = `
        <div class="flex-1 grid grid-cols-2 gap-3">
            <input type="text" placeholder="اسم الزر (مثال: الشراء الآن)" class="link-label custom-input !py-2 !px-3 !text-sm" required>
            <input type="url" placeholder="الرابط (https://...)" class="link-url custom-input !py-2 !px-3 !text-sm" required>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    `;
    container.appendChild(div);
    lucide.createIcons();
};

window.cancelForm = () => {
    viewMode = 'list';
    renderActiveTab();
};

// ---------------- ADS ---------------- //
function renderAdsList() {
    let topHtml = `
        <div class="flex justify-between items-center mb-6 animate-slide-up">
            <h3 class="text-xl font-extrabold text-gray-800">الإعلانات</h3>
            <button onclick="showAdForm()" class="flex items-center gap-2 bg-indigo-600/90 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md">
                <i data-lucide="plus" class="w-5 h-5"></i> إضافة
            </button>
        </div>
    `;

    if (adsData.length === 0) {
        contentArea.innerHTML = topHtml + `
            <div class="text-center py-16 text-gray-500 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-sm animate-slide-up">
                <i data-lucide="megaphone" class="w-14 h-14 mx-auto mb-4 opacity-30"></i>
                <p class="font-bold text-lg">لا توجد إعلانات حالياً</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    let cardsHtml = '<div class="grid grid-cols-1 gap-6 animate-slide-up">';
    adsData.forEach(a => {
        cardsHtml += `
            <div class="group relative bg-white/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden shadow-sm border border-white/70 aspect-[4/3]">
                <img src="${a.imageUrl}" class="absolute inset-0 w-full h-full object-cover opacity-0 blur-sm transition-all duration-700" onload="this.classList.remove('opacity-0', 'blur-sm')">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <button onclick="deleteAd('${a.id}', '${a.deleteUrl || ''}')" class="self-end p-3 bg-red-500/90 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg border border-red-400">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        `;
    });
    cardsHtml += '</div>';

    contentArea.innerHTML = topHtml + cardsHtml;
    lucide.createIcons();
}

window.deleteAd = async (id, deleteUrl) => {
    if (!confirm('هل أنت متأكد من حذف الإعلان؟')) return;
    try {
        if (deleteUrl && deleteUrl !== 'undefined') {
            try { await deleteFromImgBB(deleteUrl); } catch(e) { console.error('ImgBB delete', e); }
        }
        await db.collection('ads').doc(id).delete();
    } catch (e) {
        console.error("Delete Error:", e);
        alert('حدث خطأ أثناء الحذف: ' + e.message);
    }
};

window.showAdForm = () => {
    viewMode = 'form';
    contentArea.innerHTML = `
        <div class="bg-white/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/60 shadow-sm animate-slide-up">
            <div class="flex justify-between items-center mb-8">
                <h3 class="text-2xl font-extrabold text-gray-800">إضافة إعلان جديد</h3>
                <button onclick="cancelForm()" class="text-gray-400 hover:text-red-500 bg-white/50 p-2 rounded-full transition-colors"><i data-lucide="x-circle" class="w-6 h-6"></i></button>
            </div>
            <form id="ad-form" class="space-y-6">
                <div>
                    <label class="block text-base font-bold text-gray-700 mb-4">صورة الإعلان</label>
                    <label class="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-indigo-300 rounded-[1.5rem] cursor-pointer bg-indigo-50/40 hover:bg-indigo-50/80 transition-colors relative overflow-hidden group">
                        <div id="ad-img-placeholder" class="flex flex-col items-center justify-center p-6 text-center">
                            <i data-lucide="upload" class="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-transform"></i>
                            <p class="text-sm font-bold text-indigo-500">اضغط لرفع صورة</p>
                        </div>
                        <img id="ad-img-preview" class="img-preview hidden">
                        <input type="file" id="ad-image" accept="image/*" class="hidden" required>
                    </label>
                </div>
                
                <button type="submit" id="ad-submit" class="w-full mt-8 py-4 text-lg font-bold text-white bg-indigo-600/90 rounded-2xl flex justify-center items-center shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-70">
                    حفظ الإعلان
                </button>
            </form>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('ad-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                document.getElementById('ad-img-preview').src = reader.result;
                document.getElementById('ad-img-preview').classList.remove('hidden');
                document.getElementById('ad-img-placeholder').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('ad-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('ad-submit');
        const file = document.getElementById('ad-image').files[0];
        if (!file) return;

        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>';
        lucide.createIcons();

        try {
            const compressed = await compressImage(file);
            const imgRes = await uploadToImgBB(compressed);
            
            await db.collection('ads').add({
                imageUrl: imgRes.url,
                deleteUrl: imgRes.deleteUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            cancelForm();
        } catch(err) {
            alert('حدث خطأ');
            btn.disabled = false;
            btn.innerHTML = 'حفظ الإعلان';
        }
    });
};

// ---------------- BANNERS ---------------- //
function renderBannersList() {
    let topHtml = `
        <div class="flex justify-between items-center mb-6 animate-slide-up">
            <h3 class="text-xl font-extrabold text-gray-800">البنرات الجانبية</h3>
            <button onclick="showBannerForm()" class="flex items-center gap-2 bg-indigo-600/90 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md">
                <i data-lucide="plus" class="w-5 h-5"></i> إضافة
            </button>
        </div>
    `;

    if (bannersData.length === 0) {
        contentArea.innerHTML = topHtml + `
            <div class="text-center py-16 text-gray-500 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-sm animate-slide-up">
                <i data-lucide="image" class="w-14 h-14 mx-auto mb-4 opacity-30"></i>
                <p class="font-bold text-lg">لا توجد بنرات حالياً</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    let cardsHtml = '<div class="grid grid-cols-2 gap-4 animate-slide-up">';
    bannersData.forEach(b => {
        cardsHtml += `
            <div class="group relative bg-white/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden shadow-sm border border-white/70 aspect-[4/5]">
                <div class="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold">
                    ${b.position === 'right' ? 'الجهة اليمنى' : 'الجهة اليسرى'}
                </div>
                <img src="${b.imageUrl}" class="absolute inset-0 w-full h-full object-cover opacity-0 blur-sm transition-all duration-700" onload="this.classList.remove('opacity-0', 'blur-sm')">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <button onclick="deleteBanner('${b.id}', '${b.deleteUrl || ''}')" class="self-end p-3 bg-red-500/90 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg border border-red-400">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        `;
    });
    cardsHtml += '</div>';

    contentArea.innerHTML = topHtml + cardsHtml;
    lucide.createIcons();
}

window.deleteBanner = async (id, deleteUrl) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
        if (deleteUrl && deleteUrl !== 'undefined') {
            try { await deleteFromImgBB(deleteUrl); } catch(e) { console.error('ImgBB delete', e); }
        }
        await db.collection('banners').doc(id).delete();
    } catch (e) {
        console.error("Delete Error:", e);
        alert('حدث خطأ أثناء الحذف: ' + e.message);
    }
};

window.showBannerForm = () => {
    viewMode = 'form';
    contentArea.innerHTML = `
        <div class="bg-white/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/60 shadow-sm animate-slide-up">
            <div class="flex justify-between items-center mb-8">
                <h3 class="text-2xl font-extrabold text-gray-800">إضافة بنر جديد</h3>
                <button onclick="cancelForm()" class="text-gray-400 hover:text-red-500 bg-white/50 p-2 rounded-full transition-colors"><i data-lucide="x-circle" class="w-6 h-6"></i></button>
            </div>
            <form id="banner-form" class="space-y-6">
                <div>
                    <label class="block text-base font-bold text-gray-700 mb-4">موضع البنر</label>
                    <div class="flex gap-4 p-2 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60">
                        <label class="flex-1 cursor-pointer">
                            <input type="radio" name="b-position" value="right" class="peer hidden" checked>
                            <div class="text-center py-3 font-bold text-gray-500 rounded-xl peer-checked:bg-indigo-600 peer-checked:text-white transition-all shadow-sm">الجهة اليمنى</div>
                        </label>
                        <label class="flex-1 cursor-pointer">
                            <input type="radio" name="b-position" value="left" class="peer hidden">
                            <div class="text-center py-3 font-bold text-gray-500 rounded-xl peer-checked:bg-indigo-600 peer-checked:text-white transition-all shadow-sm">الجهة اليسرى</div>
                        </label>
                    </div>
                </div>

                <div>
                    <label class="block text-base font-bold text-gray-700 mb-4">صورة البنر</label>
                    <label class="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-indigo-300 rounded-[1.5rem] cursor-pointer bg-indigo-50/40 hover:bg-indigo-50/80 transition-colors relative overflow-hidden group">
                        <div id="b-img-placeholder" class="flex flex-col items-center justify-center p-6 text-center">
                            <i data-lucide="upload" class="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-transform"></i>
                            <p class="text-sm font-bold text-indigo-500">اضغط لرفع صورة</p>
                        </div>
                        <img id="b-img-preview" class="img-preview hidden">
                        <input type="file" id="b-image" accept="image/*" class="hidden" required>
                    </label>
                </div>
                
                <button type="submit" id="b-submit" class="w-full mt-8 py-4 text-lg font-bold text-white bg-indigo-600/90 rounded-2xl flex justify-center items-center shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-70">
                    حفظ البنر
                </button>
            </form>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('b-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                document.getElementById('b-img-preview').src = reader.result;
                document.getElementById('b-img-preview').classList.remove('hidden');
                document.getElementById('b-img-placeholder').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('banner-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('b-submit');
        const file = document.getElementById('b-image').files[0];
        const position = document.querySelector('input[name="b-position"]:checked').value;
        if (!file) return;

        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>';
        lucide.createIcons();

        try {
            const compressed = await compressImage(file);
            const imgRes = await uploadToImgBB(compressed);
            
            await db.collection('banners').add({
                imageUrl: imgRes.url,
                deleteUrl: imgRes.deleteUrl,
                position: position,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            cancelForm();
        } catch(err) {
            alert('حدث خطأ');
            btn.disabled = false;
            btn.innerHTML = 'حفظ البنر';
        }
    });
};
