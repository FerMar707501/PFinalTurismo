import { AppError } from '../errors/AppError.js';

const SOURCES = ['params', 'body', 'query'];

export function validate(schemas) {
  return (req, _res, next) => {
    const details = [];
    const validated = {};

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[source]);

      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            field: [source, ...issue.path].filter(Boolean).join('.'),
            message: issue.message,
          });
        }
      } else {
        validated[source] = result.data;
      }
    }

    if (details.length > 0) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Los datos enviados no son válidos.',
          details,
        ),
      );
    }

    if (validated.params) {
      req.params = validated.params;
    }
    if (validated.body) {
      req.body = validated.body;
    }
    if (validated.query) {
      req.validatedQuery = validated.query;
    }

    return next();
  };
}
