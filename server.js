require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { Cashfree } = require('cashfree-pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 3000;
const DB_FILE = './db.json';

app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.options('*', cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..'))); // Serve files from project root
app.use(express.static(path.join(__dirname, '../assets')));

const providedEnv = (process.env.CASHFREE_ENV || '').toUpperCase();
const inferredEnv = (process.env.CASHFREE_SECRET_KEY || '').toLowerCase().includes('test') ? 'SANDBOX' : 'PRODUCTION';
const cashfreeEnvironment = (providedEnv === 'SANDBOX' || providedEnv === 'PRODUCTION') ? providedEnv : inferredEnv;
console.log('Cashfree environment:', cashfreeEnvironment);
const cashfree = new Cashfree({
  "XClientId": process.env.CASHFREE_APP_ID,
  "XClientSecret": process.env.CASHFREE_SECRET_KEY,
  "XEnvironment": cashfreeEnvironment,
});

// Function to read the database
const readDB = () => {
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
};

// Function to write to the database
const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Function to save Base64 image to file
const saveBase64Image = (base64String, productId) => {
    if (!base64String || !base64String.startsWith('data:image')) {
        return base64String; // Not a Base64 image, return as is (might be a URL)
    }

    const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid Base64 image string');
    }

    const imageType = matches[1];
    console.log('Extracted image type:', imageType); // Debug log
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, 'base64');

    const filename = `product_${productId}_${Date.now()}.${imageType}`;
    const uploadDir = path.join(__dirname, '../assets/uploads'); // Assuming uploads folder in assets

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    return `uploads/${filename}`; // Return relative path for frontend (relative to assets folder)
};

// --- AUTHENTICATION ENDPOINTS ---

// User Signup
app.post('/api/auth/user/signup', (req, res) => {
  const db = readDB();
  const { email, password, firstName, lastName, phone } = req.body;

  if (db.users.find(user => user.email === email)) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const newUser = {
    id: `user${Date.now()}`,
    email,
    password, // In a real app, you should hash the password
    firstName,
    lastName,
    phone,
    cart: []
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ message: 'User created successfully' });
});

// User Login
app.post('/api/auth/user/login', (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  const user = db.users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // In a real app, you would return a JWT token here
  res.json({ message: 'Login successful', userId: user.id });
});

// Admin Signup
app.post('/api/auth/admin/signup', (req, res) => {
  const db = readDB();
  const { email, password, firstName, lastName, phone } = req.body;

  if (db.admins.find(admin => admin.email === email)) {
    return res.status(400).json({ message: 'Admin already exists' });
  }

  const newAdmin = {
    id: `admin${Date.now()}`,
    email,
    password, // In a real app, you should hash the password
    firstName,
    lastName,
    phone
  };

  db.admins.push(newAdmin);
  writeDB(db);

  res.status(201).json({ message: 'Admin created successfully' });
});

// Admin Login
app.post('/api/auth/admin/login', (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  const admin = db.admins.find(a => a.email === email && a.password === password);

  if (!admin) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // In a real app, you would return a JWT token here
  res.json({ message: 'Login successful', adminId: admin.id });
});


// --- PRODUCT ENDPOINTS ---
app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

// --- CART ENDPOINTS ---

// Get user's cart
app.get('/api/cart', (req, res) => {
    const { userId } = req.query;
    const db = readDB();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.cart);
});

// Add item to cart
app.post('/api/cart/items', (req, res) => {
    const { userId, productId, quantity, weight } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }

    const product = db.products.find(p => p.id === productId);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    const cartItem = {
        id: `cart${Date.now()}`,
        productId,
        title: product.title, // Add the product title here
        quantity,
        weight,
        price: product.pricePerKg,
        discount: product.discount
    };

    db.users[userIndex].cart.push(cartItem);
    writeDB(db);

    res.status(201).json(cartItem);
});

// Update item in cart
app.put('/api/cart/items/:itemId', (req, res) => {
    const { userId, quantity } = req.body;
    const { itemId } = req.params;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }

    const itemIndex = db.users[userIndex].cart.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found in cart' });
    }

    db.users[userIndex].cart[itemIndex].quantity = quantity;
    writeDB(db);

    res.json(db.users[userIndex].cart[itemIndex]);
});

// Delete item from cart
app.delete('/api/cart/items/:itemId', (req, res) => {
    const { userId } = req.body;
    const { itemId } = req.params;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }

    const itemIndex = db.users[userIndex].cart.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found in cart' });
    }

    db.users[userIndex].cart.splice(itemIndex, 1);
    writeDB(db);

    res.status(204).send();
});

// --- ORDER ENDPOINTS ---

app.post('/api/orders/checkout', (req, res) => {
    const { userId, shippingAddress, paymentMethod, total } = req.body; // Get total from req.body
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }

    const user = db.users[userIndex];
    if (user.cart.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
    }

    // Enrich cart items with product titles (still needed for order details)
    const enrichedItems = user.cart.map(cartItem => {
        const product = db.products.find(p => p.id === cartItem.productId);
        return {
            ...cartItem,
            title: product ? product.title : 'Unknown Product'
        };
    });

    // Use the total sent from the frontend
    const newOrder = {
        id: `order${Date.now()}`,
        userId,
        items: enrichedItems,
        total, // Use the total from req.body
        shippingAddress,
        paymentMethod,
        status: paymentMethod === 'UPI' ? 'Pending' : 'Order Placed',
        createdAt: new Date().toISOString()
    };

    db.orders.push(newOrder);
    db.users[userIndex].cart = []; // Clear the cart
    writeDB(db);

    io.emit('newOrder', newOrder); // Notify admins of the new order

    res.status(201).json(newOrder);
});

// Get user's order history
app.get('/api/orders', (req, res) => {
    const { userId } = req.query;
    const db = readDB();
    const userOrders = db.orders.filter(order => order.userId === userId);
    res.json(userOrders);
});

// Get a specific order
app.get('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    const db = readDB();
    const order = db.orders.find(o => o.id === orderId);

    if (!order) {
        return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
});

// Get tracking info for an order
app.get('/api/orders/:orderId/track', (req, res) => {
    const { orderId } = req.params;
    const db = readDB();
    const order = db.orders.find(o => o.id === orderId);

    if (!order) {
        return res.status(404).json({ message: 'Order not found' });
    }

    // In a real app, you would have more sophisticated tracking logic
    res.json({ orderId: order.id, status: order.status });
});

// --- PAYMENT ENDPOINTS ---

app.post('/api/payment/create-order', async (req, res) => {
    try {
        const { amount, userId, orderId } = req.body;

        const request = {
            "order_amount": amount,
            "order_currency": "INR",
            "order_id": orderId,
            "customer_details": {
                "customer_id": userId,
                "customer_phone": "9000000000"
            },
            "order_meta": {
                "return_url": `https://arekatikameat-backend1.onrender.com/api/payment/success?order_id=${orderId}`
            }
        };

        const response = await cashfree.PGCreateOrder("2023-08-01", request);
        if (response?.status !== 200) {
            console.error('Cashfree create order non-200:', response?.status, response?.data);
        }
        const data = response?.data || {};

        // Derive a payment link for redirect from payment_session_id
        const sessionId = data.payment_session_id;
        const baseUrl = cashfreeEnvironment === 'PRODUCTION'
          ? 'https://payments.cashfree.com/order/#'
          : 'https://payments-test.cashfree.com/order/#';
        const payment_link = sessionId ? `${baseUrl}${sessionId}` : undefined;

        res.json({ ...data, payment_link });
    } catch (error) {
        const cfErrorData = error?.response?.data || error?.message || error;
        console.error("Error creating payment order:", cfErrorData);
        res.status(500).json({ message: "Failed to create payment order", error: cfErrorData });
    }
});

app.get('/api/payment/success', async (req, res) => {
    try {
        const { order_id } = req.query;
        const db = readDB();
        const orderIndex = db.orders.findIndex(o => o.id === order_id);

        if (orderIndex === -1) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const response = await cashfree.PGOrderFetchPayments("2023-08-01", order_id);

        if (response.data[0].payment_status === "SUCCESS") {
            db.orders[orderIndex].status = "Paid";
            writeDB(db);
            io.emit('orderStatusUpdate', { orderId: order_id, status: "Paid" });
            res.redirect(`/order-confirmation.html?orderId=${order_id}`);
        } else {
            res.redirect(`/order-confirmation.html?orderId=${order_id}&error=payment-failed`);
        }
    } catch (error) {
        console.error("Error handling payment success:", error);
        res.status(500).json({ message: "Failed to handle payment success" });
    }
});

// --- ADMIN ENDPOINTS ---

// Get all orders
app.get('/api/admin/orders', (req, res) => {
    const db = readDB();
    res.json(db.orders);
});

// Update order status
app.put('/api/admin/orders/:orderId/status', (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const db = readDB();
    const orderIndex = db.orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
        return res.status(404).json({ message: 'Order not found' });
    }

    db.orders[orderIndex].status = status;
    writeDB(db);

    io.emit('orderStatusUpdate', { orderId, status });

    res.json(db.orders[orderIndex]);
});

// Add a new product
app.post('/api/admin/products', (req, res) => {
    let { title, desc, pricePerKg, discount, weights, image, quantity } = req.body;
    console.log('Received image data:', image ? image.substring(0, 50) + '...' : 'null');
    const db = readDB();

    // Save image if it's a Base64 string
    if (image && image.startsWith('data:image')) {
        try {
            image = saveBase64Image(image, `prod${Date.now()}`);
            console.log('Image path after saving:', image);
        } catch (error) {
            console.error('Error saving image:', error);
            return res.status(500).json({ message: 'Failed to save image' });
        }
    }

    const newProduct = {
        id: `prod${Date.now()}`,
        title,
        desc,
        pricePerKg,
        discount,
        weights,
        image,
        quantity
    };
    console.log('Product object before saving to DB:', newProduct);

    db.products.push(newProduct);
    writeDB(db);
    console.log('DB written successfully.');

    io.emit('productUpdate');

    res.status(201).json(newProduct);
});

// Update a product
app.put('/api/admin/products/:id', (req, res) => {
    const { id } = req.params;
    let { title, desc, pricePerKg, discount, weights, image, quantity } = req.body;
    console.log('Received image data for update:', image ? image.substring(0, 50) + '...' : 'null');
    const db = readDB();
    const productIndex = db.products.findIndex(p => p.id === id);

    if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }

    // Save image if it's a Base64 string
    if (image && image.startsWith('data:image')) {
        try {
            image = saveBase64Image(image, id);
            console.log('Image path after saving for update:', image);
        } catch (error) {
            console.error('Error saving image for update:', error);
            return res.status(500).json({ message: 'Failed to save image' });
        }
    }

    const updatedProduct = {
        ...db.products[productIndex],
        title,
        desc,
        pricePerKg,
        discount,
        weights,
        image,
        quantity
    };
    console.log('Product object before saving to DB for update:', updatedProduct);

    db.products[productIndex] = updatedProduct;
    writeDB(db);
    console.log('DB written successfully for update.');

    io.emit('productUpdate');

    res.json(updatedProduct);
});

// Delete a product
app.delete('/api/admin/products/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const productIndex = db.products.findIndex(p => p.id === id);

    if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }

    db.products.splice(productIndex, 1);
    writeDB(db);

    io.emit('productUpdate');

    res.status(204).send();
});

// Get dashboard stats
app.get('/api/admin/dashboard/stats', (req, res) => {
    const db = readDB();
    const totalOrders = db.orders.length;
    const itemsPacked = db.orders.filter(o => o.status === 'Packed').length;
    const totalRevenue = db.orders.reduce((sum, order) => sum + order.total, 0);

    res.json({ totalOrders, itemsPacked, totalRevenue });
});


// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
