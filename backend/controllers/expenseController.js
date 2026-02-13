import Expense from '../models/Expense.js';

// POST /expenses - add a new expense
export const createExpense = async (req, res) => {
    try{
        const { userId, description, amount, category, date } = req.body;
        if (!userId){
            return res.status(400).json({ message: 'User ID is required' });
        }
        //to store new expense
        const expense = new Expense({ 
            userId, 
            description, 
            amount, 
            category, 
            date });
        await expense.save();
        res.status(201).json({ message: 'Expense added successfully', expense });
    }
    catch (error){
        res.status(400).json({ message: 'Error adding expense', error: error.message });
    }
};

//GET/expenses -> To fetch all the  expenses
export const getExpenses = async (req, res) =>{
    try{
        const {userId} = req.query; // Expect userId as a query parameter
        if(!userId){
            return res.status(400).json({ message: 'User ID required' });
        }

        const expenses = (await Expense.find({userId})).sort({date: -1}); // Filter by userId and sort by date descending
        res.json(expenses);
    }
    catch(error) {
        res.status(500).json({ message: 'Error fetching expenses', error: error.message });
    }
};
