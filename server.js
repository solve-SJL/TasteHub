const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config();

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { MongoClient, ObjectId } = require("mongodb");

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

app.get("/detail/:id", async (req, res) => {
  const id = req.params.id;
  const nid = new ObjectId(id);
  const post = await db.collection("post").findOne({ _id: nid });
  res.render("detail.ejs", { post, port });
});

app.get("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const nid = new ObjectId(id);
  const post = await db.collection("post").findOne({ _id: nid });
  res.render("edit.ejs", { post });
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
