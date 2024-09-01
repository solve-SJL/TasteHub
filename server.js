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

app.get("/", async (req, res) => {
  res.send("HOME");
});
