const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
const db = new Database("zeno.db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(session({
    secret: process.env.SESSION_SECRET || "zeno-development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false
    }
}));

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
`);

// ORDERS TABLE
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);

// USER REGISTRATION
app.post("/register", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Please fill in all fields."
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters."
        });
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 12);

        const insertUser = db.prepare(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
        );

        insertUser.run(name.trim(), email.trim().toLowerCase(), hashedPassword);

        res.status(201).json({
            message: "Account created successfully!"
        });

    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                message: "This email is already registered."
            });
        }

        res.status(500).json({
            message: "Registration failed."
        });
    }
});

// USER LOGIN
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Please enter your email and password."
        });
    }

    const user = db.prepare(
        "SELECT * FROM users WHERE email = ?"
    ).get(email.trim().toLowerCase());

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    req.session.userId = user.id;

    res.json({
        message: "Login successful!",
        name: user.name
    });
});

// PLACE CUSTOMER ORDER
app.post("/orders", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please log in before placing an order."
        });
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            message: "Your cart is empty."
        });
    }

    const prices = {
        "Stylish T-Shirt": 499,
        "Classic Watch": 999,
        "Casual Shoes": 1499
    };

    const validItems = items.map(item => {
        if (!item || !prices[item.name]) {
            return null;
        }

        return {
            name: item.name,
            price: prices[item.name]
        };
    });

    if (validItems.includes(null)) {
        return res.status(400).json({
            message: "Invalid product in your cart."
        });
    }

    const total = validItems.reduce(
        (sum, item) => sum + item.price, 0
    );

    const saveOrder = db.prepare(
        "INSERT INTO orders (user_id, items, total) VALUES (?, ?, ?)"
    );

    saveOrder.run(
        req.session.userId,
        JSON.stringify(validItems),
        total
    );

    res.status(201).json({
        message: "Your order has been saved successfully!",
        total: total
    });
});

// VIEW MY ORDERS (TESTING)
app.get("/my-orders", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    const orders = db.prepare(
        "SELECT id, items, total, order_date FROM orders WHERE user_id = ?"
    ).all(req.session.userId);

    res.json(orders);
});

app.get("/", (req, res) => {
    res.send("ZENO server is running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`ZENO server running at http://localhost:${PORT}`);
});