// LOAD SAVED CART
let cart = [];

try {
    const savedCart = JSON.parse(localStorage.getItem("zenoCart")) || [];

    // FIX OLD CART ITEMS AND MERGE DUPLICATES
    savedCart.forEach(item => {
        if (!item || !item.name || !item.price) {
            return;
        }

        const quantity = Number(item.quantity) || 1;

        const existingItem = cart.find(
            cartItem => cartItem.name === item.name
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                name: item.name,
                price: Number(item.price),
                quantity: quantity
            });
        }
    });

} catch (error) {
    cart = [];
}


// SAVE CART
function saveCart() {
    localStorage.setItem("zenoCart", JSON.stringify(cart));
}


// UPDATE CART BADGE
function updateCartBadge() {
    const badge = document.querySelector(".cart-icon b");

    if (badge) {
        const totalItems = cart.reduce(
            (sum, item) => sum + item.quantity, 0
        );

        badge.textContent = totalItems;
    }
}


// ADD PRODUCT TO CART
function addToCart(name, price) {
    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: name,
            price: Number(price),
            quantity: 1
        });
    }

    saveCart();
    updateCartBadge();

    alert(name + " added to cart!");
}


// DISPLAY CART
function showCart() {

    const cartSection = document.getElementById("cart-section");
    const cartItems = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");

    if (!cartSection || !cartItems || !cartTotal) {
        return;
    }

    cartSection.style.display = "block";

    cartItems.innerHTML = "";

    let total = 0;

    cart.forEach(function(item) {

        const itemTotal = item.price * item.quantity;

        cartItems.innerHTML += `
            <p>
                ${item.name} - ₹${item.price} × ${item.quantity}
                = ₹${itemTotal}
            </p>
        `;

        total += itemTotal;

    });

    cartTotal.textContent = total;

}


// CLOSE CART
function closeCart() {

    const cartSection = document.getElementById("cart-section");

    if (cartSection) {
        cartSection.style.display = "none";
    }

}


// CHECKOUT
async function checkout() {

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const confirmOrder = confirm(
        "Do you want to place your order?"
    );

    if (!confirmOrder) {
        return;
    }

    try {

        const response = await fetch("/orders", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                items: cart
            })

        });

        const result = await response.json();

        alert(result.message);

        if (response.ok) {

            cart = [];

            saveCart();

            updateCartBadge();

            const cartItems = document.getElementById("cart-items");
            const cartTotal = document.getElementById("cart-total");

            if (cartItems) {
                cartItems.innerHTML = "";
            }

            if (cartTotal) {
                cartTotal.textContent = 0;
            }

        }

    } catch (error) {

        alert("Unable to connect to the server. Please try again.");

    }

}


// UPDATE BADGE WHEN PAGE LOADS
updateCartBadge();