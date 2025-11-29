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


const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
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

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});