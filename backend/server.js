const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.ATLAS_URI; // Get this from MongoDB Atlas
mongoose.connect(uri);

const Expense = require('./models/Expense');
const User = require('./models/User');


const connection = mongoose.connection;
connection.once('open', () => {
    console.log(`MongoDB database connection established successfully, DB: ${connection.name}`);
})

// POST /expenses endpoint
app.post('/expenses', async (req, res) => {
    try {
        const { description, amount, category, date } = req.body;
        const expense = new Expense({ description, amount, category, date });
        await expense.save();
        res.status(201).json({ message: 'Expense added successfully', expense });
    } catch (error) {
        res.status(400).json({ message: 'Error adding expense', error: error.message });
    }
});

app.get('/expenses', async (req, res) => {
    try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
})

// POST /users - register a new user
app.post('/users', async (req, res) => {
    try {
        const { firstName, lastName, phone, email, password } = req.body;
        if (!firstName || !lastName || !phone || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Note: password is stored in plaintext for this simple demo.
        // In production, hash passwords (bcrypt) and add validation.
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: 'Email already registered' });

        const user = new User({ firstName, lastName, phone, email, password });
        await user.save();
        res.status(201).json({ message: 'User registered', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});

// GET /users - list users (for debugging; hides passwords)
app.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password -__v');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});