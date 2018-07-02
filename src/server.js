const express = require('express');
const cors = require('cors');

const upload = require("./upload");
const fileList = require("./filelist");
const download = require("./download");
const deleteFile = require("./delete");

const server = express();

server.use(cors({
  origin: '*',
  optionsSuccessStatus: 200
}));

server.get('', fileList);
server.get('/:fid', download);
server.delete('/:fid', deleteFile);
server.post('', upload);

server.listen(8000, () => {
  console.log('Server started!');
});
