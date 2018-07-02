const aws = require('./aws');

module.exports = function (req, res) {
  const userId = (req.headers.authorization || '').trim();
  if (!userId) {
    res.status(403).end();
    return;
  }

  aws.db.getFileInfo(userId, req.params.fid)
    .then(aws.s3.deleteFile)
    .then(aws.db.deleteFileInfo)
    .then((file) => {
      if (file) {
        res.send({
          status: 'ok'
        })
      } else {
        res.status(404).end();
      }
    });
};
