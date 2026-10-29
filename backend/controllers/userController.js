import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import Subscription from '../models/Subscription.js';
import ChatMessage from '../models/ChatMessage.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { uploadBuffer, deleteByPublicId } from '../utils/cloudinaryService.js';
import logger from '../utils/logger.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const BCRYPT_COST = 12;

// A fixed, valid bcrypt hash of an arbitrary string — compared against whenever there's
// no real password to check (unknown email, or a Google-only account), so a bcrypt.compare
// call still runs and takes the same time either way. Without this, a timing attacker could
// tell "no such user" apart from "wrong password" purely from response latency.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

//Inpput validation, checking for  the user if it  already exists  and also is the  password stroong enough and  also storing the password in hashed format in DB
//POST/users
export const registerUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Validation: Ensure all fields are present
        if (!firstName || !lastName || !email || !password) {
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
        const salt = await bcrypt.genSalt(BCRYPT_COST);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({ firstName, lastName, email, password: hashedPassword });
        await user.save();

        // Issue a JWT on registration too, same as login — otherwise a freshly-registered
        // user has no valid token and protected calls fail until they sign in separately.
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d', algorithm: 'HS256' }
        );

        res.status(201).json({ message: 'User registered', userId: user._id, firstName: user.firstName, token });
    } catch (error) {
        next(error);
    }
};

//POST/users
//Check for the password by  comparing with the  hashed in DB
export const loginUser = async (req, res, next) =>{
    try{
        const {email, password} = req.body;
        const user = await User.findOne({email});

        // Same response (status, message, and — via the dummy-hash compare below —
        // roughly the same timing) whether the email doesn't exist, the password is
        // wrong, or the account has no password at all (Google-only). Telling these
        // apart would let an attacker enumerate which emails are registered.
        const genericInvalid = () => res.status(401).json({ message: 'Invalid email or password' });

        const isPasswordValid = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
        if (!user || !user.password || !isPasswordValid) {
            return genericInvalid();
        }
        const token = jwt.sign(
            { userId: user._id },        // what to store inside token
            process.env.JWT_SECRET,      // secret key from .env
            { expiresIn: '7d', algorithm: 'HS256' }          // token expires in 7 days
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            userId: user._id,
            firstName: user.firstName,
        });
    } catch (error) {
        next(error);
    }
};

//POST /api/users/google-login — handles both sign-in AND sign-up with one endpoint:
//an existing email logs the user in, a new email creates the account right then.
export const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: 'idToken is required' });
        }

        // Verifies the token was actually signed by Google for OUR client ID — this is
        // the entire security of this flow, no password or secret ever changes hands.
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { email, email_verified, given_name, family_name, sub: googleId } = payload;

        // Google lets an account exist with an unconfirmed email — trusting it here would let
        // someone sign up (or worse, auto-link to an existing password account) with an email
        // they don't actually control.
        if (!email_verified) {
            return res.status(401).json({ message: 'Google account email is not verified' });
        }

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            // New Google user — create the account now (this is the "sign up" path)
            user = new User({
                firstName: given_name || 'User',
                lastName: family_name || '',
                email,
                googleId,
                authProvider: 'google'
            });
            await user.save();
        } else if (!user.googleId) {
            // An account with this email already exists from password signup — link it
            // so they can use either method from now on, instead of erroring out.
            user.googleId = googleId;
            await user.save();
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d', algorithm: 'HS256' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            userId: user._id,
            firstName: user.firstName
        });
    } catch (error) {
        logger.error('Google login failed:', error);
        res.status(401).json({ message: 'Google authentication failed' });
    }
};

//Profile page
export const getUserProfile = async (req, res, next) => {
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
        next(error);
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
        logger.error('Failed to update profile:', error);
        res.status(400).json({ message: 'Failed to update profile' });
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

        const oldPhotoPublicId = user.photoPublicId;
        const { url, publicId } = await uploadBuffer(req.file.buffer, 'profile-photos');
        user.photoUrl = url;
        user.photoPublicId = publicId;
        await user.save();

        if (oldPhotoPublicId) await deleteByPublicId(oldPhotoPublicId);
        const { password, ...safeUser } = user.toObject();
        res.status(200).json(safeUser);
    } catch (error) {
        logger.error('Failed to upload photo:', error);
        res.status(400).json({ message: 'Failed to upload photo' });
    }
};

//Settings > Data & Privacy — permanently delete the account and all associated data
//DELETE /api/users/:userId
export const deleteAccount = async (req, res, next) => {
    try {
        const { userId } = req.params;
        if (userId !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(userId);
        const expensesWithReceipts = await Expense.find({ userId, receiptPublicId: { $exists: true, $ne: null } });

        // Best-effort: a Cloudinary hiccup shouldn't block the account deletion the user asked for.
        await Promise.all([
            ...expensesWithReceipts.map(e => deleteByPublicId(e.receiptPublicId).catch(err =>
                logger.error(`Failed to delete receipt ${e.receiptPublicId} during account deletion:`, err)
            )),
            user?.photoPublicId
                ? deleteByPublicId(user.photoPublicId).catch(err =>
                    logger.error(`Failed to delete profile photo ${user.photoPublicId} during account deletion:`, err)
                  )
                : Promise.resolve()
        ]);

        await Promise.all([
            Expense.deleteMany({ userId }),
            Budget.deleteMany({ userId }),
            Subscription.deleteMany({ userId }),
            ChatMessage.deleteMany({ userId }),
            User.findByIdAndDelete(userId)
        ]);

        res.status(200).json({ message: 'Account deleted' });
    } catch (error) {
        next(error);
    }
};

//Change password
//PUT /api/users/:userId/password — change password
export const changePassword = async (req, res, next) => {
    try {
        // Authz check: only the token owner can change their own password, regardless of what
        // userId is in the URL.
        if (req.params.userId !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const { currentPassword, newPassword } = req.body;
        //Find user WITH password this time (we need it to compare)
        const user = await User.findById(req.params.userId);
        if (!user.password) {
            return res.status(400).json({ message: "This account signed up with Google and doesn't have a password to change." });
        }
        // 2. Check current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        // 3. Hash the new password and save
        user.password = await bcrypt.hash(newPassword, BCRYPT_COST);
        // Lets `protect` reject any token issued before this moment — the minimal way
        // to sign out other sessions after a password change.
        user.passwordChangedAt = new Date();
        await user.save();
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

//POST /api/users/forgot-password — request a reset link by email
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });

        // Always respond the same way whether or not the email exists — otherwise this
        // endpoint becomes a way to check which emails are registered.
        const genericResponse = { message: 'If that email is registered, a reset link has been sent.' };

        if (!user) {
            return res.status(200).json(genericResponse);
        }

        // Raw token goes in the email link; only its hash is ever persisted, same
        // principle as the password itself — a DB leak alone can't reset an account.
        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;
        await sendPasswordResetEmail(user.email, resetLink);

        res.status(200).json(genericResponse);
    } catch (error) {
        next(error);
    }
};

//POST /api/users/reset-password — consume the token from the emailed link
export const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
        }

        user.password = await bcrypt.hash(newPassword, BCRYPT_COST);
        // Single-use: clear the token so this same link can't be replayed.
        user.resetPasswordTokenHash = null;
        user.resetPasswordExpires = null;
        // Same reasoning as changePassword — invalidates any session issued before this reset.
        user.passwordChangedAt = new Date();
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
};
