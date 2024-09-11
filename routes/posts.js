const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { ObjectId } = require("mongodb");
const { S3Client } = require("@aws-sdk/client-s3");
const router = express.Router();

const port = process.env.PORT;

const connectDB = require("../database");
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

// AWS 연결
const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "taste-hub",
    key: function (req, file, cb) {
      cb(null, Date.now().toString());
    },
  }),
});

function getCurrentTime(req, res, next) {
  const now = new Date();
  console.log(now.toString());
  next();
}

// 게시물 목록
router.get("/list", getCurrentTime, async (req, res) => {
  const result = await db.collection("post").find().limit(5).toArray();
  res.render("list.ejs", { posts: result, user: req.user });
});

router.get("/list/:id", getCurrentTime, async (req, res) => {
  let result = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(req.params.id) } })
    .limit(5)
    .toArray();
  res.render("list.ejs", { posts: result, user: req.user });
});

// 게시물 작성
router.get("/write", (req, res) => {
  res.render("write.ejs", { user: req.user });
});

router.post("/add", async (req, res) => {
  upload.single("img1")(req, res, async (err) => {
    if (err) return res.send("업로드에러");
    try {
      if (req.body.title === "" || req.body.content === "") {
        res.send("내용을 입력해주세요.");
      } else {
        const doc = await db.collection("post").insertOne({
          title: req.body.title,
          content: req.body.content,
          img: req.file.location,
        });
        console.log(`document 추가가됨 _id : ${doc.insertedId}`);
        res.redirect("/posts/list");
      }
    } catch (e) {
      res.status(500).send(`서버에러, log:${e}`);
    }
  });
});

// 게시물 상세 조회
router.get("/detail/:id", async (req, res) => {
  const id = req.params.id;
  const nid = new ObjectId(id);
  const post = await db.collection("post").findOne({ _id: nid });
  res.render("detail.ejs", { post, port, user: req.user });
});

// 게시물 수정 페이지
router.get("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const nid = new ObjectId(id);
  const post = await db.collection("post").findOne({ _id: nid });
  res.render("edit.ejs", { post, user: req.user });
});

// 게시물 수정 처리
router.post("/edit/:id", async (req, res) => {
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

// 게시물 삭제
router.delete("/delete", async (req, res) => {
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
    res.redirect("/posts/list");
  } catch (e) {
    res.status(500).send(`서버에러, log:${e}`);
  }
});

module.exports = router;
