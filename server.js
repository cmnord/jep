const express = require('express');
const app = express();
const axios = require("axios");

app.use(express.static('public'));

app.get("/proxy", async function(req, res) {
  try {
    if (req.query.url) {
      const apiResponse = await axios.get(req.query.url);
      res.send(apiResponse.data);
    } else {
      throw "Bad API Response";
    }
  } catch (error) {
    res.send({error: true})
  }
  
});

const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});