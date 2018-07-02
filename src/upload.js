const aws = require('./aws');
const IncomingForm = require('formidable').IncomingForm;

module.exports = function upload(req, res) {
  const userId = (req.headers.authorization || '').trim();
  if (!userId) {
    return res.status(403).end();
  }

  const form = new IncomingForm();

  let saveToS3Promises = [];
  form.on('file', (field, file) => {
    saveToS3Promises.push(
      aws.s3.uploadFile(file)
        .then(
          (file) => {
            return {
              fieldName: field,
              data: {
                status: 'ok',
                file: file
              },
            }
          },
          (err) => {
            return {
              fieldName: field,
              data: {
                status: 'error',
                content: err,
              },
            }
          }));
  });

  form.on('end', () => {
    Promise.all(saveToS3Promises)
      .then((files) => aws.db.saveFileInfo(userId, files))
      .then(function (result) {
        return result.reduce((r, c) => {
          r[c.fieldName] = c.data;
          return r;
        }, {});
      })
      .then(function (files) {
        res.send(files);
      })
  });
  form.parse(req);
};
