import { ZodError } from 'zod';

/**
 * Unified Zod Request Validation Middleware
 * Validates req.body, req.query, and/or req.params against a Zod schema.
 * Returns warm, conversational, human-friendly validation messages per Machine House standards.
 */
export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const rawIssues = error.issues || error.errors || [];
        const issues = rawIssues.map((err) => ({
          field: err.path.slice(1).join('.') || err.path.join('.'),
          message: err.message
        }));

        const friendlyMessage =
          issues[0]?.message ||
          "We couldn't save this right now. Please check the highlighted fields and try again.";

        return res.status(400).json({
          success: false,
          message: friendlyMessage,
          errors: issues
        });
      }
      next(error);
    }
  };
};

export const validate = validateRequest;

