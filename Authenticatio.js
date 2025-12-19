import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyToken=(req,res,next)=>{
    const authHeader = req.headers.authorization; 
    if (!authHeader) return res.status(401).json({ message: "No token provided" }); 
    const token = authHeader.split(" ")[1];
    try{
        const decodeData=jwt.verify(token,process.env.JWT_SECRET);
        req.user=decodeData;
        next();
    }
    catch(error){
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};
export const authorizeRoles = (...roles) => { 
    return (req, res, next) => { 
        if (!roles.includes(req.user.role)) { 
            return res.status(403).json({ message: "Access denied" });
        } 
        next();
    }; 
};
