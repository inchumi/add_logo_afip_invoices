const express = require('express')
const app = express()
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const port = process.env.port || 3000
const { writeFileSync } = require("fs");
const { PDFDocument } = require('pdf-lib')
const fs = require('fs');

app.use(express.static('public'))

const htmlSuccess = `
    <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Success merged invoice!</title>
        </head>
        <body style="font-family: sans-serif;">
            <div style="text-align: center;" class="container">
                <h1>¡INVOICE SUCCESSFULLY MERGED!</h1>
                <p>Download your file <a id="link" href="/finished/###invoicefilename###.pdf">here</a>.</p>
                <a href="#" onclick="javascript:location.href = window.location.origin">Volver</a>
            </div>
        </body>
        </html>`



const htmlFail = `
<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Merged invoice failed</title>
    </head>
    <body style="font-family: sans-serif;">
        <div style="text-align: center;" class="container">
            <h1>¡Ups!. Ha courrido un error 😭 :</h1>
            <h2>###message###</h2>
            <p><small>TIP: Los comprobantes PDF de AFIP están encriptados. Debes copiar el PDF y subir una versión no encriptada del documento para agregar tu logo. Mirá este video de <a href="https://youtu.be/NeGtw5yvxeo?t=82" target="_blank">ayuda</a>.</small></p>
            <a href="#" onclick="javascript:location.href = window.location.origin">Reintentar</a>
        </div>
    </body>
    </html>`

app.post('/upload', upload.array('data', 2), async (req, res) => {
  if (req.files.length !== 2) return res.status(400).send({ success: false, error: 'No image or pdf file were found' })

  const file1 = req.files[0]
  const file2 = req.files[1]

  if (file1.mimetype !== 'image/png') {
    const htmlResponse = htmlFail.replace('###message###', 'La imagen que subas debe estar en formato PNG (preferentemente de 300px de ancho por 100px de alto)')

    return res.status(400).send(htmlResponse)
  }
  if (file2.mimetype !== 'application/pdf') {
    const htmlResponse = htmlFail.replace('###message###', 'Debes subir el PDF con la factura que emitió AFIP.')

    return res.status(400).send(htmlResponse)
  }

  const logoFileName = file1.filename
  const invoiceFileName = file2.filename

  // Processing image logo

  const pngImageBytes = fs.readFileSync(`./uploads/${logoFileName}`)

  //Processing pdf invoice file

  try {
    const existingPdfBytes = fs.readFileSync(`./uploads/${invoiceFileName}`) // original PDF

    const pdfDoc = await PDFDocument.load(existingPdfBytes)

    const newBlankPdfDoc = await PDFDocument.create(); // new PDF document

    const [firstDonorPage] = await newBlankPdfDoc.copyPages(pdfDoc, [0]) // copy just first page in new PDF doc

    newBlankPdfDoc.addPage(firstDonorPage) // adding that page to new PDF

    const pngImage = await newBlankPdfDoc.embedPng(pngImageBytes) // embed image in new PDF doc

    const pngDims = pngImage.scaleToFit(135, 50) // escale image to fit content

    const pages = newBlankPdfDoc.getPages() // getting pages count on new PDF doc

    const firstPage = pages[0]  // asign page 1 to const 'firstPage'
    // const { width, height } = firstPage.getSize()

    firstPage.drawImage(pngImage, {
      x: firstPage.getWidth() / 2 - (pngDims.width + pngDims.width / 2),
      y: firstPage.getHeight() / 2 - pngDims.height + 344,
      width: pngDims.width,
      height: pngDims.height,
    })

    writeFileSync(`./public/finished/${invoiceFileName}.pdf`, await newBlankPdfDoc.save());

    const htmlResponse = htmlSuccess.replace('###invoicefilename###', invoiceFileName)

    res.status(200).send(htmlResponse)

  } catch (error) {
    const htmlResponse = htmlFail.replace('###message###', error.message)
    res.status(400).send(htmlFail)
  }

})

app.listen(port, function () {
  console.log('The server is running, ' +
    ' please, open your browser at http://localhost:%s',
    port);
});
