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
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");

const url = process.env.DB_URL;
const port = process.env.PORT;

app.use(passport.initialize());
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
app.use(passport.session());

const { MongoClient, ObjectId } = require("mongodb");

let db;

new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
    app.listen(port, () => {
      console.log(`http://localhost:${port} 에서 서버 실행중`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (req, res) => {
  res.render("home.ejs", { user: req.user });
});

app.get("/list/", async (req, res) => {
  let result = await db.collection("post").find().limit(5).toArray();
  res.render("list.ejs", { posts: result, user: req.user });
});

app.get("/list/:id", async (req, res) => {
  let result = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(req.params.id) } })
    .limit(5)
    .toArray();
  res.render("list.ejs", { posts: result, user: req.user });
});

app.get("/write", (req, res) => {
  res.render("write.ejs", { user: req.user });
});

app.post("/add", async (req, res) => {
  try {
    if (req.body.title === "" || req.body.content === "") {
      res.send("내용을 입력해주세요.");
    } else {
      const doc = await db
        .collection("post")
        .insertOne({ title: req.body.title, content: req.body.content });
      console.log(`document 추가가됨 _id : ${doc.insertedId}`);
      res.redirect("/list");
    }
  } catch (e) {
    res.status(500).send(`서버에러, log:${e}`);
  }
});

app.get("/detail/:id", async (req, res) => {
  const id = req.params.id;
  const nid = new ObjectId(id);
  const post = await db.collection("post").findOne({ _id: nid });
  res.render("detail.ejs", { post, port, user: req.user });
});

app.get("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const nid = new ObjectId(id);
  const post = await db.collection("post").findOne({ _id: nid });
  res.render("edit.ejs", { post, user: req.user });
});

app.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const nid = new ObjectId(id);
  const title = req.body.title;
  const content = req.body.content;
  const updateData = { title, content };

  try {
    if (title === "" || content === "") {
      res.send("값을 올바르게 수정해주세요.");
    } else {
      const result = await db.collection("post").updateOne(
        { _id: nid }, // 조건
        { $set: updateData } // 업데이트할 내용
      );

      if (result.modifiedCount > 0) {
        res.redirect(`/detail/${id}`); // 수정 후 상세 페이지로 리디렉션
      } else {
        res.send("수정에 실패했습니다.");
      }
    }
  } catch (error) {}
});

app.delete("/delete", async (req, res) => {
  const _id = req.body._id;

  if (!_id) {
    return res.status(400).send("Invalid request: _id가 필요합니다.");
  }

  try {
    const objectId = new ObjectId(_id);
    const result = await db.collection("post").deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return res.status(404).send("해당하는 게시글 찾지못하였습니다.");
    }

    console.log(`Document 삭제, _id: ${_id}`);
    res.redirect("/list");
  } catch (e) {
    res.status(500).send(`서버에러, log:${e}`);
  }
});

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

app.get("/login", async (req, res) => {
  res.render("login.ejs", { user: req.user });
});

app.post("/login", async (req, res, next) => {
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

app.get("/profile/:userId", async (req, res) => {
  res.render("profile.ejs", { user: req.user });
});

app.get("/register", (req, res) => {
  res.render("register.ejs", { user: req.user });
});

app.post("/register", async (req, res) => {
  if (req.body.useremail == "" || req.body.password == "") {
    return res.send("이메일, 비밀번호를 입력해주세요.");
  }

  if (req.body.password.length < 4) {
    return res.send("비밀번호는 4자 이상 적어주세요.");
  }

  const existUser = await db
    .collection("user")
    .findOne({ useremail: req.body.useremail });

  if (existUser) {
    return res.send("해당 유저이름이 이미 존재합니다.");
  }

  let hash = await bcrypt.hash(req.body.password, 10);

  await db.collection("user").insertOne({
    useremail: req.body.useremail,
    password: hash,
  });
  res.redirect("/");
});
