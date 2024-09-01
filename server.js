const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config();

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { MongoClient } = require("mongodb");

let db;
const url = process.env.DB_URL;
const port = process.env.PORT;
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
  res.render("home.ejs");
});

app.get("/list", async (요청, 응답) => {
  let result = await db.collection("post").find().toArray();
  응답.render("list.ejs", { posts: result });
});

app.get("/write", (req, res) => {
  res.render("write.ejs");
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
