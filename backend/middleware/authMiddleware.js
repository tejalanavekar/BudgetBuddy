//protects with JWT authorization for routes
import jwt from 'jsonwebtoken';

// Middleware to protect routes and verify JWT tokens
//protect is the middleware function, req-> to request object, res-> response, next-> to move to next steps
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization; //reads authorization header from incoming request, consist of bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized, no token provided' });
    }

    const token = authHeader.split(' ')[1]; // split the header to get the token part
    //verify the token now using the jwt secret which we have
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // verify the token using the secret key from .env
        req.userId = decoded.userId; // attach the userId from the token to the request object for use in protected routes
        next(); // move to the next middleware or route handler
    }catch(error){
        res.status(401).json({message:'Token invalid or expired, please login again'});
    }
};

export default protect;