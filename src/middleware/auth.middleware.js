
import jwt from "jsonwebtoken"
import  User  from "../models/user.model.js";


export const verifyJWT = async (req, res , next) => {
    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
    
        if (!token) {
            throw new Error("Unauthorized request")
        }
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET);        
        req.user = await User.findById(decoded.id).select("-password");    
       
        if (!req.user) {
            throw new Error("Invalid Access Token")
        }
    
        next();
    } catch (error) {
        // If access token expired, return 401 for client to use refresh token
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ 
                message: "Access token expired",
                code: "TOKEN_EXPIRED"
            });
        }
        res.status(401).json({ message: error?.message || "Invalid access token" });
    }
    
}

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

