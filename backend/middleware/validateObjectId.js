import mongoose from 'mongoose';

// A malformed :id/:userId param (anything that isn't a valid ObjectId) would otherwise
// reach a Mongoose query and throw a CastError, which the error handler turns into a 500 —
// that's a client input error, not a server failure, so catch it here as a clean 400.
const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
};

export default validateObjectId;
