const listFileInfo = require('./aws').db.listFileInfo;

module.exports = function (req, res) {
  const userId = (req.headers.authorization || '').trim();
  if (!userId) {
    return res.status(403).end();
  }

  listFileInfo(userId).then(
    function (files) {
      res.send({
          status: 'ok',
          items: files,
        }
      )
    },
    function (err) {
      console.log("Error", err);
      res.send({
        status: 'error',
        content: err,
      });
    });
};
