import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // Handle both lowercase and uppercase header variations
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
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
        // This will decode the { id, email } payload we signed in authController.js
        const verified = jwt.verify(token, secret);
        
        // Attach it to req.user. 
        // This is exactly how stagingController and profileController will know 
        // to filter by `req.user.id` to keep data strictly isolated per user.
        req.user = verified;
        
        next();
    } catch (err) {
        // PERMANENT FIX: Log the actual reason the token failed so you never have to guess again.
        console.error("JWT Verification Failed:", err.message); 
        
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token.',
            reason: err.message // Sends the exact reason back to React/Flutter for debugging
        });
    }
};

// Add this alias so legacy files looking for 'authMiddleware' won't crash
export const authMiddleware = verifyToken;