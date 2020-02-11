var multer  = require('multer')

// set Multer storage
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads') // Note: You are responsible for creating the directory when providing destination as a function
  },
  filename: function (req, file, cb) {
      const splittedOriginalFileName = file.originalname.split('.')
      const OriginalFileName = splittedOriginalFileName.slice(0, -1).join('.')
      const OriginalExtension = splittedOriginalFileName.slice(-1)
      const UniqueFileName = OriginalFileName + '-' + Date.now() + '.' + OriginalExtension
      cb(null, UniqueFileName)
},
})

// Filter files allowed to be uploaded
function fileFilter (req, file, cb) {
  // The function should call `cb` with a boolean
  // to indicate if the file should be accepted
  console.log("fileFilter :", file)
  // { fieldname: 'myFile',
  // originalname: 'suzuki.png',
  // encoding: '7bit',
  // mimetype: 'image/png' }

  // To reject this file pass `false`, like so:
  // cb(null, false)

  // To accept the file pass `true`, like so:
  cb(null, true)

  // You can always pass an error if something goes wrong:
  // cb(new Error('I don\'t have a clue!'))

}

var uploadEngine = multer({ storage: storage, fileFilter:fileFilter })

// Adding upload route
const uploadRoute = (app, namespace, apiUrlBase) => {
  console.log('Registering direct route : ', apiUrlBase + '/' + namespace + '/upload')
  app.post(apiUrlBase + '/' + namespace + '/upload', uploadEngine.single('myFile'), (req, res, next) => {
  // Credentials are injected in req.paramsWithCredentials if needed
  console.log("Uploading :", req.file)
  const file = req.file
  if (!file) {
    const error = new Error('Please upload a file')
    error.httpStatusCode = 400
    return next(error)
  }
    // Send back the file object
    // {"fieldname":"myFile","originalname":"image.png","encoding":"7bit","mimetype":"image/png","destination":"uploads","filename":"myFile-1565763932249","path":"uploads/myFile-1565763932249","size":7317}
    res.send(file)

  })
}

const upload = {
  name : 'upload',
  route : uploadRoute,
  restricted : ['Admin', 'Member'],    // Mind the Capital
}

module.exports = { queries :[ upload ] }