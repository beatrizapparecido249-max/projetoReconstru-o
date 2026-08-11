// ESTADO GLOBAL
let cart = JSON.parse(localStorage.getItem('beatriz_cart')) || [];
let freteValue = parseFloat(localStorage.getItem('beatriz_frete')) || 0;
let currentSelectedBurger = null;
let selectedExtras = {};
let drinkQuantities = { coca: 0, dolly: 0, convencao: 0, sprite: 0 };

// ELEMENTOS DOM
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeBtn = document.querySelector('.close-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartFreteVal = document.getElementById('cart-frete-val');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutBtn = document.getElementById('checkout-btn');

const customizeModal = document.getElementById('customize-modal');
const closeCustomizeBtn = document.querySelector('.close-customize-btn');
const customBurgerTitle = document.getElementById('custom-burger-title');
const customBurgerPrice = document.getElementById('custom-burger-price');
const customBurgerImg = document.getElementById('custom-burger-img');
const removeIngredientsContainer = document.getElementById('remove-ingredients-container');
const confirmAddCartBtn = document.getElementById('confirm-add-cart-btn');

const cepInput = document.getElementById('cep-input');
const calcFreteBtn = document.getElementById('calc-frete-btn');
const freteResult = document.getElementById('frete-result');

document.addEventListener('DOMContentLoaded', updateCartUI);

// SELEÇÃO DE BEBIDAS (+ e -)
document.querySelectorAll('.btn-drink-qty').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const drinkId = btn.getAttribute('data-id');
        const isPlus = btn.classList.contains('btn-drink-plus');

        if (isPlus) {
            drinkQuantities[drinkId] += 1;
        } else if (drinkQuantities[drinkId] > 0) {
            drinkQuantities[drinkId] -= 1;
        }

        const qtySpan = document.getElementById(`drink-qty-${drinkId}`);
        if (qtySpan) qtySpan.innerText = drinkQuantities[drinkId];
    });
});

// ADICIONAR BEBIDA AO CARRINHO
document.querySelectorAll('.btn-add-drink').forEach(btn => {
    btn.addEventListener('click', () => {
        const drinkId = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const price = parseFloat(btn.getAttribute('data-price'));
        const qty = drinkQuantities[drinkId];

        if (qty <= 0) {
            alert('Por favor, selecione ao menos 1 unidade da bebida usando os botões + e -');
            return;
        }

        const cartItem = {
            id: Date.now(),
            name: `${qty}x ${name}`,
            price: price * qty,
            removed: [],
            added: []
        };

        cart.push(cartItem);
        saveAndUpdateCart();

        // Reseta quantidade
        drinkQuantities[drinkId] = 0;
        document.getElementById(`drink-qty-${drinkId}`).innerText = '0';
        alert(`${qty}x ${name} adicionado ao carrinho!`);
    });
});

// MODAL DE PERSONALIZAÇÃO DE LANCHE
document.querySelectorAll('.btn-select-burger').forEach(button => {
    button.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const name = btn.getAttribute('data-name');
        const price = parseFloat(btn.getAttribute('data-price'));
        const img = btn.getAttribute('data-img');
        const ingredientsStr = btn.getAttribute('data-ingredients') || '';

        currentSelectedBurger = { name, basePrice: price, img };
        selectedExtras = {};

        customBurgerTitle.innerText = name;
        customBurgerImg.src = img;

        document.querySelectorAll('.qty-value').forEach(qtySpan => qtySpan.innerText = '0');

        removeIngredientsContainer.innerHTML = '';
        const ingredientsList = ingredientsStr.split(',').map(i => i.trim());
        ingredientsList.forEach(ing => {
            const label = document.createElement('label');
            label.classList.add('custom-option');
            label.innerHTML = `
                <input type="checkbox" class="remove-ingredient" data-name="${ing}"> Sem ${ing}
            `;
            removeIngredientsContainer.appendChild(label);
        });

        updateCustomModalPrice();
        customizeModal.style.display = 'flex';
    });
});

// CONTROLES DE ADICIONAIS NO BURGER
document.querySelectorAll('.btn-qty').forEach(btn => {
    btn.addEventListener('click', () => {
        const isPlus = btn.classList.contains('btn-plus');
        const extraName = btn.getAttribute('data-name');
        const extraPrice = parseFloat(btn.getAttribute('data-price'));

        if (!selectedExtras[extraName]) {
            selectedExtras[extraName] = { qty: 0, price: extraPrice };
        }

        if (isPlus) {
            selectedExtras[extraName].qty += 1;
        } else if (selectedExtras[extraName].qty > 0) {
            selectedExtras[extraName].qty -= 1;
        }

        const qtySpan = document.getElementById(`qty-${extraName}`);
        if (qtySpan) qtySpan.innerText = selectedExtras[extraName].qty;

        updateCustomModalPrice();
    });
});

function updateCustomModalPrice() {
    if (!currentSelectedBurger) return;
    let totalPrice = currentSelectedBurger.basePrice;

    for (let name in selectedExtras) {
        totalPrice += selectedExtras[name].qty * selectedExtras[name].price;
    }

    customBurgerPrice.innerText = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
}

// CONFIRMAR ADIÇÃO DO BURGER
if (confirmAddCartBtn) {
    confirmAddCartBtn.addEventListener('click', () => {
        if (!currentSelectedBurger) return;

        let finalPrice = currentSelectedBurger.basePrice;
        let removedItems = [];
        let addedItems = [];

        document.querySelectorAll('.remove-ingredient:checked').forEach(chk => {
            removedItems.push(chk.getAttribute('data-name'));
        });

        for (let name in selectedExtras) {
            if (selectedExtras[name].qty > 0) {
                const qty = selectedExtras[name].qty;
                finalPrice += qty * selectedExtras[name].price;
                addedItems.push(`${qty}x ${name}`);
            }
        }

        const cartItem = {
            id: Date.now(),
            name: currentSelectedBurger.name,
            price: finalPrice,
            removed: removedItems,
            added: addedItems
        };

        cart.push(cartItem);
        saveAndUpdateCart();
        customizeModal.style.display = 'none';
    });
}

// FECHAR MODAIS
if (closeCustomizeBtn) closeCustomizeBtn.onclick = () => customizeModal.style.display = 'none';
if (closeBtn) closeBtn.onclick = () => cartModal.style.display = 'none';

window.onclick = (e) => {
    if (e.target === cartModal) cartModal.style.display = 'none';
    if (e.target === customizeModal) customizeModal.style.display = 'none';
};

// FRETE
if (calcFreteBtn) {
    calcFreteBtn.onclick = () => {
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep.length !== 8) {
            freteResult.innerText = 'CEP inválido!';
            freteResult.style.color = '#e74c3c';
            return;
        }
        freteValue = 8.90;
        freteResult.innerText = 'Frete fixo: R$ 8,90';
        freteResult.style.color = '#2ecc71';
        localStorage.setItem('beatriz_frete', freteValue);
        updateCartUI();
    };
}

function saveAndUpdateCart() {
    localStorage.setItem('beatriz_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    cartCount.innerText = cart.length;
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color:#a0a0b0;">Carrinho vazio.</p>';
    } else {
        cart.forEach(item => {
            subtotal += item.price;
            let details = '';
            if (item.removed && item.removed.length) details += `<div style="font-size:0.75rem; color:#e74c3c">🚫 Sem: ${item.removed.join(', ')}</div>`;
            if (item.added && item.added.length) details += `<div style="font-size:0.75rem; color:#2ecc71">➕ Extra: ${item.added.join(', ')}</div>`;

            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.innerHTML = `
                <div>
                    <strong>${item.name}</strong>
                    ${details}
                    <div style="color:var(--accent-gold)">R$ ${item.price.toFixed(2).replace('.', ',')}</div>
                </div>
                <button onclick="removeItem(${item.id})" style="background:#e74c3c; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">X</button>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
    }

    const total = subtotal + (cart.length > 0 ? freteValue : 0);
    if (cartSubtotal) cartSubtotal.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if (cartFreteVal) cartFreteVal.innerText = `R$ ${(cart.length > 0 ? freteValue : 0).toFixed(2).replace('.', ',')}`;
    if (cartTotalPrice) cartTotalPrice.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

window.removeItem = (id) => {
    cart = cart.filter(item => item.id !== id);
    saveAndUpdateCart();
};

if (cartBtn) cartBtn.onclick = () => cartModal.style.display = 'flex';
if (checkoutBtn) {
    checkoutBtn.onclick = () => {
        if (cart.length === 0) return alert('Carrinho vazio!');
        alert('Pedido realizado com sucesso!');
        cart = [];
        saveAndUpdateCart();
        cartModal.style.display = 'none';
    };
}