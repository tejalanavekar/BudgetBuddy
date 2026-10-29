//protects with JWT authorization for routes
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const INVALID_TOKEN_RESPONSE = { message: 'Token invalid or expired, please login again' };

// Middleware to protect routes and verify JWT tokens
//protect is the middleware function, req-> to request object, res-> response, next-> to move to next steps
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization; //reads authorization header from incoming request, consist of bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized, no token provided' });
    }

    const token = authHeader.split(' ')[1]; // split the header to get the token part
    //verify the token now using the jwt secret which we have
    try{
        // Pinning the algorithm stops a forged token signed/crafted with a different
        // algorithm (e.g. "none", or HS256 re-signed with a key an attacker controls
        // under a different alg) from ever being accepted.
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        // A token issued before the account's last password change is a session that
        // should have been signed out — this is the one way to actually revoke a JWT
        // before it expires on its own.
        const user = await User.findById(decoded.userId).select('passwordChangedAt');
        if (!user) {
            return res.status(401).json(INVALID_TOKEN_RESPONSE);
        }
        // Both sides compared at whole-second resolution (JWT iat has no sub-second
        // precision) — otherwise a token issued in the same second as the password
        // change, but a few hundred ms after it, could be wrongly rejected.
        if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
            return res.status(401).json(INVALID_TOKEN_RESPONSE);
        }

        req.userId = decoded.userId; // attach the userId from the token to the request object for use in protected routes
        next(); // move to the next middleware or route handler
    }catch(error){
        res.status(401).json(INVALID_TOKEN_RESPONSE);
    }
};

export default protect;