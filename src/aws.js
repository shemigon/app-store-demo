const AWS = require('aws-sdk');
const fs = require('fs');
const uuid = require('uuid/v1');

const bucketName = process.env.AWS_BUCKET_NAME;
const awsParams = {
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'us-east-1'
};

// dynamodb

function getFileInfo(userId, fileId) {
  return new Promise(function (resolve, reject) {
    const ddb = new AWS.DynamoDB(awsParams);
    let params = {
      ExpressionAttributeNames: {
        '#u': 'user',
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':u': {S: userId},
        ':f': {S: fileId},
      },
      KeyConditionExpression: '#id = :f',
      FilterExpression: '#u = :u',
      TableName: 'user-files'
    };
    ddb.query(params, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject(err);
      } else {
        resolve(
          data.Items.length ?
            Object.entries(data.Items[0])
              .map((k) => {
                return [k[0], Object.values(k[1])[0]];
              })
              .reduce((r, c) => {
                r[c[0]] = c[1];
                return r
              }, {})
            :
            undefined
        );
      }
    });
  });

}

function getFileList(userId) {
  return new Promise(function (resolve, reject) {
    const ddb = new AWS.DynamoDB(awsParams);
    let params = {
      ExpressionAttributeNames: {
        '#u': 'user',
      },
      ExpressionAttributeValues: {
        ':u': {S: userId},
      },
      FilterExpression: '#u = :u',
      TableName: 'user-files'
    };
    ddb.scan(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.Items.map((el) => {
          return Object.entries(el)
            .map((k) => {
              return [k[0], Object.values(k[1])[0]];
            })
            .reduce((r, c) => {
              r[c[0]] = c[1];
              return r
            }, {});
        }))
      }
    })
  });
}

function saveFileInfo(userId, files) {
  return new Promise(function (resolve, reject) {
    const ddb = new AWS.DynamoDB(awsParams);
    const request = {
      RequestItems: {
        "user-files": files.map(function ({fieldName, data: {status, file}}) {
          return {
            PutRequest: {
              Item: {
                "id": {"S": file.id},
                "name": {"S": file.name},
                "size": {"N": file.size.toString()},
                "path": {"S": file.path},
                "type": {"S": file.type},
                "user": {"S": userId},
              }
            }
          }
        })
      }
    };
    ddb.batchWriteItem(request, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject(err);
      } else {
        console.log("Success", data);
        resolve(files);
      }
    });
  });
}

function deleteFileInfo(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      return resolve(file);
    }
    const ddb = new AWS.DynamoDB(awsParams);
    let params = {
      Key: {
        "id": {S: file.id},
      },
      TableName: "user-files",
    };
    ddb.deleteItem(params, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject(err);
      } else {
        resolve(file);
      }
    });
  });
}

// s3

function getFileFromS3(path) {
  const s3 = new AWS.S3(awsParams);
  return s3.getObject({
    Bucket: bucketName,
    Key: path,
  }).createReadStream();
}

function uploadToS3(file) {
  const s3 = new AWS.S3(awsParams);
  const fileName = file.name;
  const id = uuid();
  const size = file.size;
  const Key = id + '-' + fileName;
  const fileType = file.type;

  return new Promise(function (resolve, reject) {
    fs.readFile(file.path, function (err, data) {
      const params = {
        Key: Key,
        Bucket: bucketName,
        Body: data,
        ContentType: fileType,
        ContentLength: size,
      };
      s3.upload(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: id,
            name: fileName,
            size: size,
            path: Key,
            type: fileType,
          });
        }
      });
    });
  })
}

function deleteFromS3(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      return resolve(file);
    }

    const s3 = new AWS.S3(awsParams);
    s3.deleteObject({
      Bucket: bucketName,
      Key: file.path,
    }, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject(err);
      } else {
        resolve(file);
      }
    })
  });
}


module.exports = {
  s3: {
    getFile: getFileFromS3,
    uploadFile: uploadToS3,
    deleteFile: deleteFromS3,
  },
  db: {
    listFileInfo: getFileList,
    getFileInfo: getFileInfo,
    saveFileInfo: saveFileInfo,
    deleteFileInfo: deleteFileInfo,
  }
};
