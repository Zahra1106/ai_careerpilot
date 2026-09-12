const { fail } = require("../utils/apiResponse");

/**
 * Lightweight validator — checks that each required field exists,
 * is a non-empty string, and (optionally) meets a minimum length.
 * Avoids pulling in a full schema library for a portfolio-scale backend.
 *
 * Usage: validateBody({ jobDescription: { required: true, minLength: 20 } })
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push(`"${field}" is required.`);
        continue;
      }

      if (value !== undefined && rules.type === "string" && typeof value !== "string") {
        errors.push(`"${field}" must be a string.`);
      }

      if (
        value !== undefined &&
        rules.minLength &&
        typeof value === "string" &&
        value.trim().length < rules.minLength
      ) {
        errors.push(`"${field}" must be at least ${rules.minLength} characters.`);
      }

      if (value !== undefined && rules.enum && !rules.enum.includes(value)) {
        errors.push(`"${field}" must be one of: ${rules.enum.join(", ")}.`);
      }
    }

    if (errors.length > 0) {
      return fail(res, 400, errors.join(" "), "VALIDATION_ERROR", errors);
    }

    next();
  };
}

module.exports = { validateBody };
