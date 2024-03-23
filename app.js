const dotenv = require("dotenv");
const express = require("express");

const apiAuth = require("./helper/apiAuthentication");
const cors = require("cors");
const mongoose = require("mongoose");

const path = require("path");
dotenv.config();

//db connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("DB Connected");
  })
  .catch((err) => {
    console.log(err);
  });

const usersRouter = require("./user/user.route");
const groupRouter = require("./Group/group.route");
const expenseRouter = require("./Expense/expense.route");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/group", apiAuth.validateToken, groupRouter);
app.use("/api/expense", apiAuth.validateToken, expenseRouter);

if (
  process.env.NODE_ENV === "production" ||
  process.env.NODE_ENV === "staging"
) {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

//To detect and log invalid api hits
app.all("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: "Invalid path",
  });
});

const port = process.env.PORT || 3001;
app.listen(port, (err) => {
  console.log(`Server started in PORT | ${port}`);
  console.log(`Server started in PORT | ${port}`);
});
