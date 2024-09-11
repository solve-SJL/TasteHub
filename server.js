const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
dotenv.config();

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");

const url = process.env.DB_URL;
const port = process.env.PORT;

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 1000 }, // 로그인 유지 시간
    store: MongoStore.create({
      mongoUrl: url,
      dbName: "forum",
    }),
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.listen(port, () => {
  console.log(`http://localhost:${port} 에서 서버 실행중`);
});

// 라우터 불러오기
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const profileRoutes = require("./routes/profile");

// 라우터 사용
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/profile", profileRoutes);
