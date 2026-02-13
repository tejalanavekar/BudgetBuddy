import User from '../models/User.js';
import bcrypt from 'bcryptjs';

//Inpput validation, checking for  the user if it  already exists  and also is the  password stroong enough and  also storing the password in hashed format in DB
//POST/users
export const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, phone, email, password } = req.body;

        // Validation: Ensure all fields are present
        if (!firstName || !lastName || !phone || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Security: Strong Password Regex
        const passwordRegex = /^(?=.*[0-9])(?!.*[#&$ ])(?!.* ).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: 'Password must be 8+ chars, include a number, and no spaces or #, &, $.' 
            });
        }

        // Database Check: Prevent duplicate emails
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: 'Email already registered' });

        // Security: Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({ firstName, lastName, phone, email, password: hashedPassword });
        await user.save();
        
        res.status(201).json({ message: 'User registered', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

//POST/users
//Check for the password by  comparing with the  hashed in DB
export const loginUser = async (req, res) =>{
    try{
        const {email, password} = req.body;
        const user = await User.findOne({email});
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        res.status(200).json({
            message: 'Login successful',
            userId: user._id,
            firstName: user.firstName,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

//GET/users
//Handles  the  fetching of  the  users data
export const getUsers = async (req, res)=>{
    try{
        const users = await User.find().select('-password -__v'); // select to exclude password and version fields
        res.json(users);

    }
    catch(error){
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};
