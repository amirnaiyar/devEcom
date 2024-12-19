const express = require("express");
const app = express();
const port = process.env.PORT || 5001;
const DBConnection = require("./database");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const productRouter = require("./routes/product");
const categoryRouter = require("./routes/category");
const cartRouter = require("./routes/cart");
const wishlistRouter = require("./routes/wishlist");
const reviewRouter = require("./routes/review");
const orderRouter = require("./routes/order");
const invoicesRouter = require("./routes/invoice");
const subcategoryRouter = require("./routes/subcategory");
const colorRouter = require("./routes/color");
const sizeRouter = require("./routes/size");
const couponRouter = require("./routes/coupon");

app.use(bodyParser.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5001",
  "http://localhost:3000",
  "https://ecom-reset.vercel.app",
  "https://ecom-admin-five-pink.vercel.app",
];

const corsOption = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow if origin is in the list or for server-to-server requests
    } else {
      callback(new Error("Not allowed by CORS")); // Block requests from unallowed origins
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};
app.options("*", cors(corsOption)); // Handle preflight requests for all routes
app.use(cors(corsOption));

DBConnection.then(() => {
  console.log("Database connected successful");
  app.listen(port, () => {
    console.log("server started on " + port);
  });
}).catch((err) => {
  console.error(err);
  process.exit(1); // Exit the application with an error code 1.
});

app.options("*", cors()); // Enable pre-flight across-the-board
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/products", productRouter);
app.use("/categories", categoryRouter);
app.use("/subcategories", subcategoryRouter);
app.use("/cart", cartRouter);
app.use("/wishlist", wishlistRouter);
app.use("/review", reviewRouter);
app.use("/orders", orderRouter);
app.use("/invoices", invoicesRouter);
app.use("/color", colorRouter);
app.use("/size", sizeRouter);
app.use("/coupon", couponRouter);

app.get("/", (req, res) => {
  res.json({
    message: "App is running successfully!",
  });
});
