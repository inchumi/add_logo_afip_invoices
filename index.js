const express = require('express')
const app = express()
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const port = 3000
const { writeFileSync } = require("fs");
const { PDFDocument } = require('pdf-lib')
const fs = require('fs');

app.use(express.static('public'))

let pngImageBytes, imgName, globalFileName

app.post('/logo', upload.single('imgfile'), async (req, res) => {
  const filename = req.file.filename
  globalFileName = req.file.filename
  imgName = req.file.originalname
  if (!filename) return res.send({ success: false, error: 'No image file were upload' })

  try {
    pngImageBytes = fs.readFileSync(`./uploads/${filename}`)
    res.send({ success: true, message: "OK image" })
  } catch (error) {
    res.send({ success: false, error: error.message })
  }
})

app.post('/factura', upload.single('pdffile'), async (req, res) => {
  const filename = req.file.filename
  if (!filename) return res.send({ success: false, error: 'No invoice PDF file were upload' })

  try {
    const existingPdfBytes = fs.readFileSync(`./uploads/${filename}`)

    const pdfDoc = await PDFDocument.load(existingPdfBytes)

    const newBlankPdfDoc = await PDFDocument.create();

    const [firstDonorPage] = await newBlankPdfDoc.copyPages(pdfDoc, [0])

    newBlankPdfDoc.addPage(firstDonorPage)

    if (!globalFileName) throw new Error('No subiste el logo!')

    const existingImgBytes = fs.readFileSync(`./uploads/${globalFileName}`)

    const pngImage = await newBlankPdfDoc.embedPng(existingImgBytes)

    const pngDims = pngImage.scaleToFit(135, 50)

    const pages = newBlankPdfDoc.getPages()

    const firstPage = pages[0]
    // const { width, height } = firstPage.getSize()

    firstPage.drawImage(pngImage, {
      x: firstPage.getWidth() / 2 - (pngDims.width + pngDims.width / 2),
      y: firstPage.getHeight() / 2 - pngDims.height + 344,
      width: pngDims.width,
      height: pngDims.height,
    })

    // const pdfBytes = await pdfDoc.save()
    // console.log(pdfBytes);
    // return pdfBytes
    writeFileSync(`./public/${filename}.pdf`, await newBlankPdfDoc.save());

    res.send({ sucess: true, link: `http://localhost:3000/${filename}.pdf` })

  } catch (error) {
    res.send({ success: false, error: error.message })
  }



});

app.listen(port, function () {
  console.log('The server is running, ' +
    ' please, open your browser at http://localhost:%s',
    port);
});
