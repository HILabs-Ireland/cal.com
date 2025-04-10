const http = require("http");
const connect = require("connect");
const { createProxyMiddleware } = require("http-proxy-middleware");

const apiProxyV1 = createProxyMiddleware({
  target: "http://localhost:3003",
});

const app = connect();
app.use("/", apiProxyV1);

http.createServer(app).listen(3002);
