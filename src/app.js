import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express()

// CORS configuration
app.use(cors({
    origin: "*", 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static("public"))
app.use(cookieParser());



//Routes import
import userRoutes from "./routes/user.route.js"
import productRoutes from "./routes/product.route.js"
import collectionRoutes from "./routes/collection.route.js"
import cartRoutes from "./routes/cart.route.js"
import adminRoutes from "./routes/admin.routes.js"

//Admin
app.use("/api/admin", adminRoutes)


//api

app.use("/api/user", userRoutes)
app.use("/api/collections", collectionRoutes)
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)

app.get('/', (req, res) => {
    res.send('Backend is Running!');
});

export { app }