
const Product = require('../models/productModel.js');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  const products = await Product.find({});
  res.json(products);
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  const { title, desc, pricePerKg, discount, weights, image, quantity } = req.body;

  const product = new Product({
    title,
    desc,
    pricePerKg,
    discount,
    weights,
    image,
    quantity,
    user: req.user._id,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  const { title, desc, pricePerKg, discount, weights, image, quantity } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    product.title = title;
    product.desc = desc;
    product.pricePerKg = pricePerKg;
    product.discount = discount;
    product.weights = weights;
    product.image = image;
    product.quantity = quantity;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await product.remove();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
