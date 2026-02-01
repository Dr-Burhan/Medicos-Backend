import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ================= REGISTER ================= */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: "User already exists" 
      });
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 4. Generate JWT tokens
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // 6. Set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: false, 
      secure: false,  
      sameSite: "strict",
      maxAge: 12 * 60 * 60 * 1000 // 12 hours

    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: false,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/* ================= LOGIN ================= */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3. Generate JWT tokens
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // 4. Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

      res.cookie("accessToken", accessToken, {
    httpOnly: false, 
    secure: false,  
    sameSite: "strict",
maxAge: 12 * 60 * 60 * 1000 // 12 hours
  });

  // ✅ store refresh token in cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: false,
    secure: false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/* ================= LOGOUT ================= */
export const logoutUser = async (req, res) => {
  try {
    // Clear cookies
    res.clearCookie("accessToken", {
      httpOnly: false,
      secure: false,
      sameSite: "strict",
    });
    res.clearCookie("refreshToken", {
      httpOnly: false,
      secure: false,
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET CURRENT USER (/me) ================= */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        memberSince: user.createdAt
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= REFRESH TOKEN ================= */
  export const refreshAccessToken = async (req, res) => {
  try {;
    const { refreshToken } = req.cookies?.refreshToken || req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    // 1. Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // 2. Check if token matches database
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // 3. Generate new access token
    const newAccessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      message: "Access token refreshed",
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};


export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is updating their own profile or is admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    const allowedUpdates = ['name', 'email', 'password'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Allow admin to update role
    if (req.body.role && req.user.role === 'admin') {
      updates.role = req.body.role;
    }

    // Check if email is being changed to an existing email
    if (updates.email && updates.email !== user.email) {
      const emailExists = await User.findOne({ email: updates.email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update user
    Object.assign(user, updates);
    await user.save();

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
};


export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id && req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUserId: id
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

export const updateCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, email, phone, address } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed to an existing email
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.phone = phone ?? user.phone;
    user.address = address ?? user.address;

    await user.save({ validateModifiedOnly: true });
    
    const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
    };

    res.status(200).json({
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update current user error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};


