import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";

export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalOrders = await Order.countDocuments();

    const revenueAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" }
        }
      }
    ]);

    const revenue = revenueAgg[0]?.totalRevenue || 0;

    const activeProducts = await Product.countDocuments({ isActive: true });

    res.status(200).json({
      totalUsers,
      totalOrders,
      revenue,
      activeProducts
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const userToUpdate = await User.findById(userId);

    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optional: Prevent an admin from changing their own role
    if (userToUpdate._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    res.status(200).json({
      message: 'User role updated successfully',
      user: userToUpdate
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
};
