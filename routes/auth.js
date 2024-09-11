const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const LocalStrategy = require("passport-local");
const router = express.Router();
const connectDB = require("./../database");

// MongoDB 연결
let db;

connectDB
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

// 이메일 & 비번 검증 미들웨어
function checkAuthInput(req, res, next) {
  const { useremail, password } = req.body;
  if (!useremail || !password) {
    return res
      .status(400)
      .json({ message: "이메일 또는 비밀번호를 입력해주세요." });
  }
  next();
}

// 이메일&비번이 DB와 일치하는지 검증 정의
passport.use(
  new LocalStrategy(
    { usernameField: "useremail", passwordField: "password" },
    async (email, password, cb) => {
      let result = await db.collection("user").findOne({ useremail: email });
      if (!result) {
        return cb(null, false, { message: "아이디 DB에 없음" });
      }

      if (await bcrypt.compare(password, result.password)) {
        return cb(null, result);
      } else {
        // 일치하지않으면 false값 반환
        return cb(null, false, { message: "비번불일치" });
      }
    }
  )
);

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, useremail: user.useremail });
  });
});

passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    done(null, result);
  });
});

// 로그인 라우트
router.get("/login", async (req, res) => {
  res.render("login.ejs", { user: req.user });
});

router.post("/login", checkAuthInput, async (req, res, next) => {
  // 이메일 & 비밀번호 검증 사용
  passport.authenticate("local", (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);

    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  })(req, res, next);
});

// 회원가입 라우트

router.get("/register", (req, res) => {
  res.render("register.ejs", { user: req.user });
});

router.post("/register", checkAuthInput, async (req, res) => {
  const { useremail, password, confirm_password, username, nickname } =
    req.body;
  // 1. 이메일, 비밀번호 입력 확인
  if (!useremail || !password || !confirm_password || !username || !nickname) {
    return res.send("모든 항목을 입력해주세요.");
  }

  // 2. 비밀번호와 확인 비밀번호 비교
  if (password !== confirm_password) {
    return res.send("비밀번호와 확인 비밀번호가 일치하지 않습니다.");
  }

  // 3. 비밀번호 길이 확인
  if (password.length < 4) {
    return res.send("비밀번호는 4자 이상 적어주세요.");
  }

  // 4. 이메일 중복 확인
  const existUserEmail = await db.collection("user").findOne({ useremail });
  if (existUserEmail) {
    return res.send("해당 이메일이 이미 존재합니다.");
  }

  // 5. 닉네임 중복 확인
  const existUserNickname = await db.collection("user").findOne({ nickname });
  if (existUserNickname) {
    return res.send("해당 닉네임이 이미 존재합니다.");
  }

  let hash = await bcrypt.hash(req.body.password, 10);

  await db.collection("user").insertOne({
    useremail,
    password: hash,
    username,
    nickname,
  });
  res.redirect("/");
});

module.exports = router;
