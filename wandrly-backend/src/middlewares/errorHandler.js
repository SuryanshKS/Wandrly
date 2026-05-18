export const globalErrorHandler = (err, req, res, next) => {
    console.error(err);

    // Check if it's our specific Prisma "Unique Constraint" error (e.g., duplicate email)
    if (err.code === 'P2002') {
        return res.status(409).json({ error: "A user with this email already exists." });
    }

    // Default to 500 Internal Server Error for anything else
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: err.message || "Internal Server Error",
        // Only show the full stack trace in development mode for security!
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};