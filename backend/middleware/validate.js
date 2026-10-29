// Runs a zod schema against req.body (or req.query/req.params, via `source`) before the
// controller runs — bad input gets a clean 400 with a specific message instead of
// reaching a controller that assumes well-formed data.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      message: result.error.issues[0]?.message || 'Invalid request'
    });
  }
  // req.query/req.params are getter-only in Express 5 — assign fields individually
  // instead of replacing the whole object.
  if (source === 'body') {
    req.body = result.data;
  } else {
    Object.assign(req[source], result.data);
  }
  next();
};

export default validate;
