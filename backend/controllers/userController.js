import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import Subscription from '../models/Subscription.js';
import ChatMessage from '../models/ChatMessage.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

        // Issue a JWT on registration too, same as login — otherwise a freshly-registered
        // user has no valid token and protected calls fail until they sign in separately.
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ message: 'User registered', userId: user._id, firstName: user.firstName, token });
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
        const token = jwt.sign(
            { userId: user._id },        // what to store inside token
            process.env.JWT_SECRET,      // secret key from .env
            { expiresIn: '7d' }          // token expires in 7 days
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            userId: user._id,
            firstName: user.firstName,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

//Profile page
export const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        // Authz check: the verified token owner (req.userId) must match the profile being requested,
        // not just any authenticated user's own claim of which userId they're asking for.
        if (userId !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const user = await User.findById(userId).select('-password'); // exclude password
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

//Settings > Account tab — update name/phone
//PUT /api/users/:userId
export const updateUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        if (userId !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { firstName, lastName, phone, preferences, notificationPrefs } = req.body;
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (phone !== undefined) user.phone = phone;
        // Merge rather than replace, so updating one preference doesn't wipe the others
        if (preferences !== undefined) user.preferences = { ...(user.preferences?.toObject?.() || {}), ...preferences };
        if (notificationPrefs !== undefined) user.notificationPrefs = { ...(user.notificationPrefs?.toObject?.() || {}), ...notificationPrefs };

        await user.save();
        const { password, ...safeUser } = user.toObject();
        res.status(200).json(safeUser);
    } catch (error) {
        res.status(400).json({ message: 'Failed to update profile', error: error.message });
    }
};

//Settings > Account tab — upload a profile photo
//PUT /api/users/:userId/photo (multipart, field name "photo")
export const uploadProfilePhoto = async (req, res) => {
    try {
        const { userId } = req.params;
        if (userId !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No image uploaded' });
        }
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.photoUrl = req.file.filename;
        await user.save();
        const { password, ...safeUser } = user.toObject();
        res.status(200).json(safeUser);
    } catch (error) {
        res.status(400).json({ message: 'Failed to upload photo', error: error.message });
    }
};

//Settings > Data & Privacy — permanently delete the account and all associated data
//DELETE /api/users/:userId
export const deleteAccount = async (req, res) => {
    try {
        const { userId } = req.params;
        if (userId !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await Promise.all([
            Expense.deleteMany({ userId }),
            Budget.deleteMany({ userId }),
            Subscription.deleteMany({ userId }),
            ChatMessage.deleteMany({ userId }),
            User.findByIdAndDelete(userId)
        ]);

        res.status(200).json({ message: 'Account deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete account', error: error.message });
    }
};

//Change password
//PUT /api/users/:userId/password — change password
export const changePassword = async (req, res) => {
    try {
        // Authz check: only the token owner can change their own password, regardless of what
        // userId is in the URL.
        if (req.params.userId !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const { currentPassword, newPassword } = req.body;
        //Find user WITH password this time (we need it to compare)
        const user = await User.findById(req.params.userId);
        // 2. Check current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        // 3. Hash the new password and save
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating password', error: error.message });
    }
};
