const express = require("express")
const AppError = require("./utils/appError")
const GlobalErrorHandler = require("./controllers/errorController")

const playGroundRoutes = require("./routes/playgroundRoutes")
const userRoutes = require("./routes/userRoutes")
const bookingRoutes = require("./routes/bookingRoutes")
const adminRoutes = require("./routes/adminRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const chatRoutes = require("./routes/chatRoutes")
const adRoutes = require("./routes/adRoutes")


const cookieParser = require("cookie-parser")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const morgan = require("morgan")
// const mongoSanitize = require("express-mongo-sanitize")
const path = require("path")
const cors = require("cors");
const favouritesRoutes = require("./routes/favouritesRoutes.js")

const app = express()


// app.use(cors({
//   origin: '*',               // Allow all origins
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['*'],     // Allow all request headers
//   exposedHeaders: ['*'],     // Allow all response headers to be visible to client
// }));
app.use(cors());
app.use(express.json());

// Handle preflight requests globally
// app.options('*', cors());

app.use(cookieParser())

// Set some http headers 
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'"],
//       imgSrc: ["'self'", "data:", "blob:", "*"], // Allow images from any source
//       connectSrc: ["'self'"],
//       fontSrc: ["'self'"],
//       objectSrc: ["'none'"],
//       mediaSrc: ["'self'"],
//       frameSrc: ["'none'"],
//     },
//   },
//   crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin requests
// }))
app.use(helmet());
// Limit user requests
// const limiter = rateLimit({
//     max: Number(process.env.RATE_LIMIT_MAX_REQUESTS),
//     windowMs: Number(process.env.RATE_LIMIT_WINDOW_HOUR) * 60 * 60 * 1000,
//     message: "Too many request from this IP, Please try in an hour."
// })
// app.use("/", limiter)

if (process.env.NODE_ENV === "development") { app.use(morgan("dev")) }

// Data sanitization against NoSql query injections
// app.use(mongoSanitize())

// Setting Routes
app.use("/static", cors(), express.static(path.join(__dirname, "public")))

// Handle preflight requests for static files
// app.options("/static/*", cors())

// app routes

// Health check (for Railway/uptime monitors)
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use("/users", userRoutes)
app.use("/playgrounds", playGroundRoutes)
app.use("/bookings", bookingRoutes)
app.use("/favourites", favouritesRoutes)
app.use("/admin", adminRoutes)
app.use("/notifications", notificationRoutes)
app.use("/chat", chatRoutes)
app.use("/ads", adRoutes)

// // Test route to verify server is working
// app.get("/test", (req, res) => {
//   res.status(200).json({ message: "Server is working!" });
// });

// // Log all registered routes after mounting
// console.log(
//   '\n🔍 Registered routes:',
//   app._router.stack
//     .filter((layer) => layer.route)
//     .map(layer => {
//       const methods = Object.keys(layer.route.methods)
//         .map(m => m.toUpperCase())
//         .join(',');
//       return `${methods} ${layer.route.path}`;
//     })
// );


// Handle unhandled routes
app.all("*", (req, res, next) => {
  console.log(`404 - Route not found: ${req.originalUrl}`);
  return next(new AppError(`Can not find ${req.originalUrl} on this server`, 404));
});

// Global error handling middleware
app.use(GlobalErrorHandler)

module.exports = app