// Runs a zod schema against req.body before the controller runs — bad input gets
// a clean 400 with a specific message instead of reaching a controller that assumes
// well-formed data.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: result.error.issues[0]?.message || 'Invalid request body'
    });
  }
  req.body = result.data;
  next();
};

export default validate;
