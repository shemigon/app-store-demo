const aws = require('./aws');


module.exports = function (req, res) {
  const userId = (req.headers.authorization || '').trim();
  if (!userId) {
    return res.status(403).end();
  }

  aws.db.getFileInfo(userId, req.params.fid)
    .then(function (file) {
      if (!file) {
        return res.status(404).end();
      }
      aws.s3.getFile(file.path).on('data', () => {
        res.setHeader("content-type", file.type);
        res.setHeader("content-disposition", `attachment; filename="${file.name}"`);
      })
        .pipe(res);
    })

};
