const express = require("express")
const app = express()
const port = process.env.PORT || 5001
const DBConnection = require("./database")
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const authRouter = require('./routes/auth')
const userRouter = require('./routes/user')
const productRouter = require('./routes/product')
const categoryRouter = require('./routes/category')
const cartRouter = require('./routes/cart')
const wishlistRouter = require('./routes/wishlist')
const reviewRouter = require('./routes/review')
const orderRouter = require('./routes/order')
const invoicesRouter = require('./routes/invoice')

app.use(bodyParser.json())
app.use(cookieParser())

DBConnection.then(() => {
    console.log("Database connected successful")
    app.listen(port, () => {
        console.log('server started on ' + port)
    })
}).catch (err => {
    console.error(err)
    process.exit(1)  // Exit the application with an error code 1.
})


app.use('/auth', authRouter)
app.use('/user', userRouter)
app.use('/products', productRouter)
app.use('/categories', categoryRouter)
app.use('/cart', cartRouter)
app.use('/wishlist', wishlistRouter)
app.use('/review', reviewRouter)
app.use('/orders', orderRouter)
app.use("/invoices", invoicesRouter)

app.get("/", (req, res) => {
    res.json({
        message: 'App is running successfully!'
    })

})