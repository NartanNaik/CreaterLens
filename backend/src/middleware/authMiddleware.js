import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer <token>"

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    const secret = process.env.JWT_SECRET;

    // Security Patch: Never fall back to a hardcoded string. 
    // If the environment variable is missing, block the authentication to prevent forged tokens.
    if (!secret) {
        console.error("CRITICAL ERROR: JWT_SECRET is not defined in the environment variables.");
        return res.status(500).json({
            success: false,
            message: 'Internal server configuration error.'
        });
    }

    try {
        const verified = jwt.verify(token, secret);
        req.user = verified;
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
};

// Add this alias so legacy files looking for 'authMiddleware' won't crash
export const authMiddleware = verifyToken;