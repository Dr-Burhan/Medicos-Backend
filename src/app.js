import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

const app = express();
const __dirname = path.resolve();

// ================= CORS =================
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://medicos-store.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// ================= MIDDLEWARE =================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// ================= API ROUTES =================
import userRoutes from "./routes/user.route.js";
import productRoutes from "./routes/product.route.js";
import collectionRoutes from "./routes/collection.route.js";
import cartRoutes from "./routes/cart.route.js";
import adminRoutes from "./routes/admin.routes.js";

app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);


app.get('/', (req, res) => {
    res.send('Backend is Running!');
});

// ================= FRONTEND (PRODUCTION) =================
  
app.use(express.static(path.join(__dirname, "dist")));

// ================= SPA FALLBACK =================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

export { app };
